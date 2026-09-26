// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title AgriShieldPolicy — kural ve kanıt defteri
/// @notice Bu sözleşme PARA TAŞIMAZ. Üç bağımsız tanıktan (uydu, yer istasyonu, resmi meteoroloji)
///         en az ikisi EVET derse "ödeme onaylandı" kaydı üretir. Ödeme TL olarak, FAST ile bankadan
///         yapılır; zincire yalnızca banka referansının parmak izi (hash) yazılır.
///         KİŞİSEL VERİ YOK: sadece takma adlı parsel kimliği (ör. "P-1182") ve hash'ler.
contract AgriShieldPolicy {
    // ───────────── roller ─────────────
    address public admin; // kuralları yöneten konsorsiyum hesabı (üretimde çoklu imza + timelock)
    mapping(address => bool) public isOracle; // tanık verisini imzalı ileten servis(ler)
    mapping(address => bool) public isPayer; // ödeme servisi (banka referansını yazar)
    bool public paused; // devre kesici

    // ───────────── sabit tavanlar ─────────────
    uint8 public constant MAX_PAYOUTS_PER_PARCEL_SEASON = 1; // parsel başına sezonda 1 tetik
    uint16 public constant MAX_PAYOUTS_PER_DAY = 25; // günde en fazla 25 ödeme onayı (devre kesici)

    enum Outcome {
        NONE,
        ODE, // ≥2 EVET → ödeme onaylandı
        GRI_BOLGE, // 1 EVET → eksper incelemesi
        ODEME_YOK // 0 EVET → ödeme yok (itiraz hakkı korunur)
    }

    struct Witnesses {
        bool sat;
        bool station;
        bool meteo;
        bool satSet;
        bool stationSet;
        bool meteoSet;
    }

    struct Case {
        Witnesses w;
        string parcelPseudoId;
        bytes32 seasonKey;
        uint256 amountTl;
        bytes32 evidenceHash;
        Outcome outcome;
        bool opened;
        bool finalized;
    }

    mapping(bytes32 => Case) public cases; // decisionId → vaka
    mapping(bytes32 => uint8) public payoutsPerParcelSeason; // keccak(parcel, sezon) → ödeme sayısı
    mapping(uint256 => uint16) public payoutsPerDay; // gün numarası → ödeme sayısı

    // ───────────── olaylar (herkes okur) ─────────────
    event CaseOpened(bytes32 indexed decisionId, string parcelPseudoId, bytes32 seasonKey, uint256 amountTl);
    event WitnessSubmitted(bytes32 indexed decisionId, uint8 witnessIndex, bool verdict, bytes32 dataHash);
    event DecisionAnchored(
        bytes32 indexed decisionId,
        string parcelPseudoId,
        uint8 yesCount,
        uint8 outcome,
        uint256 amountTl,
        bytes32 evidenceHash,
        uint256 ts
    );
    event PaymentReferenced(bytes32 indexed decisionId, bytes32 paymentRefHash, uint256 ts);
    event CircuitBreakerTripped(string reason, uint256 ts);
    event CircuitBreakerReset(uint256 ts);

    modifier onlyAdmin() {
        require(msg.sender == admin, "yalniz yonetici");
        _;
    }
    modifier onlyOracle() {
        require(isOracle[msg.sender], "yalniz oracle");
        _;
    }
    modifier onlyPayer() {
        require(isPayer[msg.sender], "yalniz odeme servisi");
        _;
    }
    modifier notPaused() {
        require(!paused, "devre kesici acik");
        _;
    }

    constructor(address oracle, address payer) {
        admin = msg.sender;
        isOracle[oracle] = true;
        isPayer[payer] = true;
    }

    // ───────────── vaka akışı ─────────────

    /// @notice Bir karar vakası açar (takma adlı parsel, sezon, poliçedeki ödeme tutarı).
    function openCase(bytes32 decisionId, string calldata parcelPseudoId, bytes32 seasonKey, uint256 amountTl)
        external
        onlyOracle
        notPaused
    {
        Case storage c = cases[decisionId];
        require(!c.opened, "vaka zaten acik");
        c.opened = true;
        c.parcelPseudoId = parcelPseudoId;
        c.seasonKey = seasonKey;
        c.amountTl = amountTl;
        emit CaseOpened(decisionId, parcelPseudoId, seasonKey, amountTl);
    }

    /// @notice Tanık kararını kaydeder. 0 = uydu, 1 = yer istasyonu, 2 = resmi meteoroloji.
    ///         dataHash: tanığın ölçüm paketinin parmak izi (veri zincir dışında, kanıtı zincirde).
    function submitWitness(bytes32 decisionId, uint8 witnessIndex, bool verdict, bytes32 dataHash)
        external
        onlyOracle
        notPaused
    {
        Case storage c = cases[decisionId];
        require(c.opened && !c.finalized, "vaka kapali");
        if (witnessIndex == 0) {
            require(!c.w.satSet, "uydu tanigi zaten var");
            (c.w.sat, c.w.satSet) = (verdict, true);
        } else if (witnessIndex == 1) {
            require(!c.w.stationSet, "istasyon tanigi zaten var");
            (c.w.station, c.w.stationSet) = (verdict, true);
        } else if (witnessIndex == 2) {
            require(!c.w.meteoSet, "meteoroloji tanigi zaten var");
            (c.w.meteo, c.w.meteoSet) = (verdict, true);
        } else {
            revert("gecersiz tanik");
        }
        emit WitnessSubmitted(decisionId, witnessIndex, verdict, dataHash);
    }

    /// @notice Üç tanığın EVET'lerini sayar ve kararı mühürler. Kural kodun içinde, herkes görür.
    function finalize(bytes32 decisionId, bytes32 evidenceHash) external onlyOracle notPaused returns (uint8 outcome) {
        Case storage c = cases[decisionId];
        require(c.opened && !c.finalized, "vaka kapali");
        require(c.w.satSet && c.w.stationSet && c.w.meteoSet, "tanik eksik");

        uint8 yes = (c.w.sat ? 1 : 0) + (c.w.station ? 1 : 0) + (c.w.meteo ? 1 : 0);
        Outcome o;
        if (yes >= 2) o = Outcome.ODE; // ödeme onaylandı → banka FAST ile öder
        else if (yes == 1) o = Outcome.GRI_BOLGE; // gri bölge → eksper incelemesi
        else o = Outcome.ODEME_YOK; // ödeme yok → itiraz hakkı korunur

        if (o == Outcome.ODE) {
            bytes32 key = keccak256(abi.encode(c.parcelPseudoId, c.seasonKey));
            require(payoutsPerParcelSeason[key] < MAX_PAYOUTS_PER_PARCEL_SEASON, "sezon tavani");
            uint256 day = block.timestamp / 1 days;
            require(payoutsPerDay[day] < MAX_PAYOUTS_PER_DAY, "gunluk tavan");
            payoutsPerParcelSeason[key] += 1;
            payoutsPerDay[day] += 1;
        }

        c.outcome = o;
        c.evidenceHash = evidenceHash;
        c.finalized = true;
        emit DecisionAnchored(
            decisionId,
            c.parcelPseudoId,
            yes,
            uint8(o),
            o == Outcome.ODE ? c.amountTl : 0,
            evidenceHash,
            block.timestamp
        );
        return uint8(o);
    }

    /// @notice Bankanın FAST referansının parmak izini yazar: "ödendi" de kanıtlı olur.
    function referencePayment(bytes32 decisionId, bytes32 paymentRefHash) external onlyPayer {
        Case storage c = cases[decisionId];
        require(c.finalized && c.outcome == Outcome.ODE, "odeme onayi yok");
        emit PaymentReferenced(decisionId, paymentRefHash, block.timestamp);
    }

    // ───────────── yönetim ─────────────

    /// @notice Devre kesici: anormal ödeme dalgasında sistemi durdurur.
    function pause(string calldata reason) external onlyAdmin {
        paused = true;
        emit CircuitBreakerTripped(reason, block.timestamp);
    }

    function unpause() external onlyAdmin {
        paused = false;
        emit CircuitBreakerReset(block.timestamp);
    }

    function setOracle(address a, bool on) external onlyAdmin {
        isOracle[a] = on;
    }

    function setPayer(address a, bool on) external onlyAdmin {
        isPayer[a] = on;
    }
}
