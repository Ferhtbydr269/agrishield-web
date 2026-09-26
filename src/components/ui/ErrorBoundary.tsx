"use client";
import { Component, type ReactNode } from "react";
import { TriangleAlert } from "lucide-react";

/** Her bölüm bağımsız: biri hata verirse diğerleri çalışmaya devam eder. */
export class ErrorBoundary extends Component<{ children: ReactNode; label?: string; fallback?: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error) {
    console.error(`[${this.props.label ?? "bölüm"}]`, error);
  }
  render() {
    if (this.state.error) {
      return (
        this.props.fallback ?? (
          <div className="panel flex items-center gap-3 p-5 text-dim" role="alert">
            <TriangleAlert className="size-5 text-wheat-fg" aria-hidden />
            <div>
              <div className="font-semibold text-text">Bu bölüm şu an gösterilemiyor.</div>
              <div className="text-sm">{this.props.label ? `${this.props.label}: ` : ""}diğer bölümler çalışmaya devam ediyor.</div>
            </div>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
