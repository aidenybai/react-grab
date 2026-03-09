"use client";

import React, { Component, createRef } from "react";

interface LegacyModalProps {
  visible: boolean;
  title?: string;
  width?: number;
  onOk?: () => void;
  onCancel?: () => void;
  okText?: string;
  cancelText?: string;
  closable?: boolean;
  maskClosable?: boolean;
  children: React.ReactNode;
}

interface LegacyModalState {
  animating: boolean;
}

const ANIMATION_DURATION_MS = 300;

export class LegacyModal extends Component<LegacyModalProps, LegacyModalState> {
  private overlayRef = createRef<HTMLDivElement>();
  private animationTimer: ReturnType<typeof setTimeout> | null = null;

  static defaultProps = {
    width: 520,
    okText: "OK",
    cancelText: "Cancel",
    closable: true,
    maskClosable: true,
  };

  state: LegacyModalState = {
    animating: false,
  };

  componentDidUpdate(prevProps: LegacyModalProps) {
    if (prevProps.visible !== this.props.visible) {
      if (this.animationTimer) {
        clearTimeout(this.animationTimer);
      }
      this.setState({ animating: true });
      this.animationTimer = setTimeout(() => {
        this.animationTimer = null;
        this.setState({ animating: false });
      }, ANIMATION_DURATION_MS);
    }
  }

  componentWillUnmount() {
    if (this.animationTimer) {
      clearTimeout(this.animationTimer);
    }
  }

  handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === this.overlayRef.current && this.props.maskClosable) {
      this.props.onCancel?.();
    }
  };

  render() {
    const {
      visible,
      title,
      width,
      onOk,
      onCancel,
      okText,
      cancelText,
      closable,
      children,
    } = this.props;

    if (!visible && !this.state.animating) return null;

    const overlayStyle: React.CSSProperties = {
      position: "fixed",
      inset: 0,
      zIndex: 1000,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(0, 0, 0, 0.45)",
      opacity: visible ? 1 : 0,
      transition: "opacity 0.3s ease",
    };

    const modalStyle: React.CSSProperties = {
      width,
      maxWidth: "90vw",
      backgroundColor: "#fff",
      borderRadius: "8px",
      boxShadow: "0 6px 16px rgba(0, 0, 0, 0.08)",
      transform: visible ? "scale(1)" : "scale(0.95)",
      transition: "transform 0.3s ease",
    };

    return (
      <div
        ref={this.overlayRef}
        style={overlayStyle}
        onClick={this.handleOverlayClick}
      >
        <div style={modalStyle}>
          {(title || closable) && (
            <div
              style={{
                padding: "16px 24px",
                borderBottom: "1px solid #f0f0f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontSize: "16px", fontWeight: 600 }}>{title}</span>
              {closable && (
                <button
                  onClick={onCancel}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "18px",
                    color: "#999",
                  }}
                >
                  &times;
                </button>
              )}
            </div>
          )}
          <div style={{ padding: "24px" }}>{children}</div>
          <div
            style={{
              padding: "10px 16px",
              borderTop: "1px solid #f0f0f0",
              display: "flex",
              justifyContent: "flex-end",
              gap: "8px",
            }}
          >
            {onCancel && (
              <button
                onClick={onCancel}
                style={{
                  padding: "4px 16px",
                  border: "1px solid #d9d9d9",
                  borderRadius: "6px",
                  background: "#fff",
                  cursor: "pointer",
                }}
              >
                {cancelText}
              </button>
            )}
            {onOk && (
              <button
                onClick={onOk}
                style={{
                  padding: "4px 16px",
                  border: "none",
                  borderRadius: "6px",
                  background: "#1677ff",
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                {okText}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
}

export default LegacyModal;
