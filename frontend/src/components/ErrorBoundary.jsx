import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error("ErrorBoundary:", error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <main className="page-shell">
          <section className="page-hero">
            <div><p className="eyebrow">Something went wrong</p><h2>Page Error</h2><p className="page-hero__copy">Try refreshing or navigating to another section.</p></div>
          </section>
          <section className="studio-grid">
            <article className="panel panel--alerts">
              <div className="panel__header"><div><p className="eyebrow">Error details</p><h2>What happened</h2></div></div>
              <div className="report-card"><p><strong>{this.state.error?.message || "Unknown error"}</strong></p></div>
              <div className="quick-actions"><button className="copilot-submit" onClick={() => this.setState({ hasError: false, error: null })} type="button">Try Again</button></div>
            </article>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}
