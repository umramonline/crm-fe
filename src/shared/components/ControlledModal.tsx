import { Modal } from "@adminlte/react";
import { useEffect, useId, useState, type ReactNode } from "react";

type BootstrapModal = {
  show: () => void;
  hide: () => void;
  dispose: () => void;
};

type BootstrapModalConstructor = {
  getOrCreateInstance: (
    element: Element,
    options?: { backdrop?: boolean | "static"; keyboard?: boolean; focus?: boolean },
  ) => BootstrapModal;
  getInstance: (element: Element) => BootstrapModal | null;
};

declare global {
  interface Window {
    bootstrap?: {
      Modal: BootstrapModalConstructor;
    };
  }
}

type ControlledModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: "sm" | "lg" | "xl";
  scrollable?: boolean;
  centered?: boolean;
  footer?: ReactNode;
  children: ReactNode;
};

function releaseModalFocus(modalElement: HTMLElement): void {
  const active = document.activeElement;
  if (active instanceof HTMLElement && modalElement.contains(active)) {
    active.blur();
  }
}

export function ControlledModal({
  isOpen,
  onClose,
  title,
  size = "lg",
  scrollable = true,
  centered = true,
  footer,
  children,
}: ControlledModalProps) {
  const modalId = useId().replace(/:/g, "");
  const [isMounted, setIsMounted] = useState(isOpen);

  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isMounted) {
      return;
    }

    const modalElement = document.getElementById(modalId);
    if (!modalElement || !window.bootstrap) {
      return;
    }

    const modalRoot = modalElement;
    const modalInstance = window.bootstrap.Modal.getOrCreateInstance(modalRoot, {
      backdrop: true,
      keyboard: true,
      focus: true,
    });

    function handleHide(): void {
      releaseModalFocus(modalRoot);
    }

    function handleHidden(): void {
      setIsMounted(false);
      onClose();
    }

    modalElement.addEventListener("hide.bs.modal", handleHide);
    modalElement.addEventListener("hidden.bs.modal", handleHidden);

    if (isOpen) {
      modalInstance.show();
    } else {
      modalInstance.hide();
    }

    return () => {
      modalElement.removeEventListener("hide.bs.modal", handleHide);
      modalElement.removeEventListener("hidden.bs.modal", handleHidden);
    };
  }, [isMounted, isOpen, modalId, onClose]);

  if (!isMounted) {
    return null;
  }

  return (
    <Modal
      id={modalId}
      title={title}
      size={size}
      scrollable={scrollable}
      centered={centered}
      footer={footer}
    >
      {children}
    </Modal>
  );
}
