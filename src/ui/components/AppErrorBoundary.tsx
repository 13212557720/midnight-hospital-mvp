import { Component, type ErrorInfo, type PropsWithChildren, type ReactNode } from 'react';

interface AppErrorBoundaryState {
  error?: Error;
}

export class AppErrorBoundary extends Component<PropsWithChildren, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {};

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('[midnight-hospital] render error', error, info);
    }
  }

  render(): ReactNode {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <main className="app-shell">
        <section className="game-frame app-error-boundary">
          <div className="panel panel-pad stack">
            <div>
              <h1 className="story-title">主神终端异常</h1>
              <p className="story-text">当前界面渲染失败。游戏状态已保存在浏览器本地，可刷新后继续尝试。</p>
            </div>
            <button className="primary-button" type="button" onClick={() => window.location.reload()}>
              重新加载
            </button>
          </div>
        </section>
      </main>
    );
  }
}
