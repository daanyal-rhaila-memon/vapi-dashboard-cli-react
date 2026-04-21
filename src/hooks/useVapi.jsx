import { useState, useCallback, useEffect } from 'react';
import * as VapiModule from '@vapi-ai/web';

const resolveVapiClass = (moduleValue) => {
  if (!moduleValue) return null;

  // Handle CJS/ESM interop where constructor can be nested in default.default.
  let candidate = moduleValue;
  for (let i = 0; i < 3; i += 1) {
    if (typeof candidate === 'function') return candidate;
    if (candidate && typeof candidate.Vapi === 'function') return candidate.Vapi;
    if (candidate && 'default' in candidate) {
      candidate = candidate.default;
      continue;
    }
    break;
  }

  return typeof candidate === 'function' ? candidate : null;
};

export const useVapi = (config) => {
  const [vapi, setVapi] = useState(null);
  const [state, setState] = useState({
    isSessionActive: false,
    isLoading: false,
    error: null,
  });

  const VapiClass = resolveVapiClass(VapiModule);

  useEffect(() => {
    if (!config.publicKey || !VapiClass) {
      setVapi(null);
      if (!VapiClass) {
        setState(prev => ({
          ...prev,
          error: 'Vapi client class could not be resolved from @vapi-ai/web.',
          isLoading: false,
        }));
      }
      return undefined;
    }

    const vapiInstance = new VapiClass(config.publicKey, config.baseUrl);
    setVapi(vapiInstance);

    const handleCallStart = () => {
      setState(prev => ({ ...prev, isSessionActive: true, isLoading: false }));
    };

    const handleCallEnd = () => {
      setState(prev => ({ ...prev, isSessionActive: false, isLoading: false }));
    };

    const handleError = (error) => {
      setState(prev => ({ ...prev, error: error.message, isLoading: false }));
    };

    vapiInstance.on('call-start', handleCallStart);
    vapiInstance.on('call-end', handleCallEnd);
    vapiInstance.on('error', handleError);

    return () => {
      vapiInstance.off('call-start', handleCallStart);
      vapiInstance.off('call-end', handleCallEnd);
      vapiInstance.off('error', handleError);
    };
  }, [config.publicKey, config.baseUrl, VapiClass]);

  const startCall = useCallback(async () => {
    if (!vapi) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      await vapi.start(config.assistantId);
    } catch (error) {
      setState(prev => ({ ...prev, error: error.message, isLoading: false }));
    }
  }, [vapi, config.assistantId]);

  const endCall = useCallback(() => {
    if (!vapi) return;
    vapi.stop();
  }, [vapi]);

  return {
    startCall,
    endCall,
    ...state,
  };
};
