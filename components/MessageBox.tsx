// components/MessageBox.tsx
'use client'; // This component is interactive

interface MessageBoxProps {
  message: string | null;
  type: 'success' | 'error' | 'info' | '';
  onClose: () => void;
}

const MessageBox: React.FC<MessageBoxProps> = ({ message, type, onClose }) => {
  if (!message) return null;

  const bgColor = type === 'success' ? 'bg-green-100 border-green-400 text-green-700' :
                  type === 'error' ? 'bg-red-100 border-red-400 text-red-700' :
                  'bg-blue-100 border-blue-400 text-blue-700';

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50`}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-sm w-full border border-gray-200 dark:border-gray-700 animate-fade-in-up">
        <div className={`border-l-4 p-4 mb-4 rounded-md ${bgColor}`} role="alert">
          <p className="font-bold mb-1">{type === 'success' ? 'Success!' : type === 'error' ? 'Error!' : 'Info!'}</p>
          <p>{message}</p>
        </div>
        <button
          onClick={onClose}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition duration-150 ease-in-out transform hover:scale-105"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default MessageBox;