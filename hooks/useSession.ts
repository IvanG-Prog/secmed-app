import { useEffect, useState } from 'react';
import { hasRegisteredDoctor, hasActiveSession } from '../utils/auth/localAuth';

export function useSession() {
  const [state, setState] = useState<'loading' | 'noDoctor' | 'login' | 'main'>('loading');

  useEffect(() => {
    async function check() {
      const doctorExists = await hasRegisteredDoctor();
      if (!doctorExists) return setState('noDoctor');

      const active = await hasActiveSession();
      if (!active) return setState('login');

      setState('main');
    }
    check();
  }, []);

  return state;
}
