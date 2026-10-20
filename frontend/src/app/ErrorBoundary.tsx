import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(error, info.componentStack);
  }

  private reset = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <div
        role="alert"
        className="m-6 rounded-lg border border-red-200 bg-white p-6 text-center"
      >
        <h2 className="text-lg font-semibold text-gray-900">Không thể hiển thị phần này</h2>
        <p className="mt-2 text-sm text-gray-600">
          Đã có lỗi khi hiển thị nội dung. Các phần khác của trang vẫn dùng được.
        </p>
        <button
          type="button"
          onClick={this.reset}
          className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Thử lại
        </button>
      </div>
    );
  }
}
