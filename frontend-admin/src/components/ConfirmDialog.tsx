import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react';

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  inputPlaceholder?: string;
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  prompt: (options: ConfirmOptions & { inputPlaceholder: string }) => Promise<string | false>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [inputValue, setInputValue] = useState('');
  const resolveRef = useRef<((value: boolean | string) => void) | null>(null);
  const isPromptRef = useRef(false);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    isPromptRef.current = false;
    setInputValue('');
    setOptions(opts);
    return new Promise((resolve) => {
      resolveRef.current = resolve as (value: boolean | string) => void;
    });
  }, []);

  const prompt = useCallback((opts: ConfirmOptions & { inputPlaceholder: string }): Promise<string | false> => {
    isPromptRef.current = true;
    setInputValue('');
    setOptions(opts);
    return new Promise((resolve) => {
      resolveRef.current = resolve as (value: boolean | string) => void;
    });
  }, []);

  const handleResponse = (confirmed: boolean) => {
    if (confirmed && isPromptRef.current) {
      resolveRef.current?.(inputValue || false);
    } else {
      resolveRef.current?.(confirmed);
    }
    resolveRef.current = null;
    isPromptRef.current = false;
    setOptions(null);
    setInputValue('');
  };

  return (
    <ConfirmContext.Provider value={{ confirm, prompt }}>
      {children}
      {options && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => handleResponse(false)}
          />
          <div className="relative bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {options.title || 'Confirmar accion'}
            </h3>
            <p className="text-gray-600 mb-4">{options.message}</p>
            {options.inputPlaceholder && (
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={options.inputPlaceholder}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 mb-4 resize-none"
                rows={3}
                autoFocus
              />
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => handleResponse(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                {options.cancelText || 'Cancelar'}
              </button>
              <button
                onClick={() => handleResponse(true)}
                disabled={!!options.inputPlaceholder && !inputValue.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {options.confirmText || 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx.confirm;
}

export function usePrompt() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('usePrompt must be used within ConfirmProvider');
  return ctx.prompt;
}
