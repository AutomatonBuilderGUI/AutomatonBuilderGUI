import { createPortal } from "react-dom";

const ErrorMessageBox: React.FC<{
  onClose: () => void;
  message: string;
}> = ({ onClose, message }) => {
  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded shadow-lg text-center">
        <p className="mb-4">{message}</p>
        <div className="flex justify-center gap-4">
          <button
            className="bg-red-600 text-white py-2 px-4 rounded"
            onClick={onClose}
          >
            OK
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default ErrorMessageBox;
