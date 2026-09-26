import backtest from "@data/backtest.json";
import climate from "@data/climate-siverek.json";
import { Hero } from "@/components/sections/Hero";
import { Problem } from "@/components/sections/Problem";
import { Solution } from "@/components/sections/Solution";
import { Product } from "@/components/sections/Product";
import { Field } from "@/components/sections/Field";
import { DemoConsole } from "@/components/sections/DemoConsole";
import { Commercial } from "@/components/sections/Commercial";
import { Risk } from "@/components/sections/Risk";
import { Roadmap } from "@/components/sections/Roadmap";
import { Team } from "@/components/sections/Team";
import { Presentation } from "@/components/presentation/Presentation";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

export default function Home() {
  const season2025 = climate.season2025;
  const seasons = backtest.seasons.map((s) => ({ season: s.season, aprMayRainMm: s.aprMayRainMm, triggered: s.triggered, bothDays: s.bothDays, meteoDays: s.meteoDays }));
  const backtestP = backtest.summary.probability;
  return (
    <Presentation season2025={season2025} seasons={seasons} backtestP={backtestP}>
      <div className="snap-flow">
        <Hero />
        <ErrorBoundary label="Problem">
          <Problem season2025={season2025} />
        </ErrorBoundary>
        <ErrorBoundary label="Çözüm">
          <Solution />
        </ErrorBoundary>
        <ErrorBoundary label="Ürün">
          <Product />
        </ErrorBoundary>
        <Field />
        <ErrorBoundary label="Demo">
          <DemoConsole />
        </ErrorBoundary>
        <ErrorBoundary label="Ticari">
          <Commercial seasons={seasons} backtestP={backtestP} />
        </ErrorBoundary>
        <ErrorBoundary label="Risk">
          <Risk />
        </ErrorBoundary>
        <Roadmap />
        <Team />
      </div>
    </Presentation>
  );
}
