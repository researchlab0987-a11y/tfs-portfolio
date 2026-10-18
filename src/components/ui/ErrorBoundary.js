'use client';
/**
 * Keeps one broken section from taking the page down. Visitors see nothing;
 * admins see what failed so it can be fixed.
 */
import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error) {
    console.error('[section] render failed:', error);
  }
  componentDidUpdate(prev) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }
  render() {
    if (!this.state.error) return this.props.children;
    if (!this.props.showError) return null;
    return (
      <div className="mx-auto my-6 max-w-site rounded-card border border-red-300 bg-red-50 p-4 text-sm text-red-800">
        <strong>{this.props.label || 'This section'} could not be displayed.</strong> Open its settings and check the
        values, or delete it. ({String(this.state.error?.message || this.state.error)})
      </div>
    );
  }
}
