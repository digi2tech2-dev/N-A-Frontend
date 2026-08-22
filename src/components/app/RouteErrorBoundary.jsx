import React from 'react';

class RouteErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    if (import.meta.env.DEV) {
      console.error('Failed to render route', error, errorInfo);
    }
  }

  componentDidUpdate(previousProps) {
    if (previousProps.routeKey !== this.props.routeKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main className="flex min-h-screen items-center justify-center px-4" role="alert">
        <div className="w-full max-w-md rounded-3xl border border-[color:rgb(var(--color-border-rgb)/0.9)] bg-[color:rgb(var(--color-card-rgb)/0.96)] p-7 text-center shadow-[var(--shadow-subtle)]">
          <h1 className="text-xl font-bold text-[var(--color-text)]">تعذر فتح الصفحة</h1>
          <p className="mt-3 text-sm leading-7 text-[var(--color-text-secondary)]">
            حدث خطأ مؤقت أثناء تحميل الصفحة. أعد المحاولة، أو ارجع إلى الصفحة الرئيسية.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-sm font-bold text-white"
            >
              إعادة المحاولة
            </button>
            <button
              type="button"
              onClick={() => window.location.assign('/')}
              className="rounded-xl border border-[var(--color-border)] px-5 py-2.5 text-sm font-bold text-[var(--color-text)]"
            >
              الرئيسية
            </button>
          </div>
        </div>
      </main>
    );
  }
}

export default RouteErrorBoundary;
