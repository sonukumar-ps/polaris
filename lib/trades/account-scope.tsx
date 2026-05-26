import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { listAccounts } from './service';
import type { TradingAccount } from './service';

type AccountScopeContextValue = {
  accounts: TradingAccount[];
  error: string | null;
  isLoading: boolean;
  selectedAccountIds: string[];
  selectedAccounts: TradingAccount[];
  toggleAccount: (accountId: string) => void;
};

const AccountScopeContext = createContext<AccountScopeContextValue | null>(null);

export function AccountScopeProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    async function loadTradingAccounts() {
      setError(null);
      setIsLoading(true);

      try {
        const loadedAccounts = await listAccounts();
        const defaultAccount = loadedAccounts.find((account) => account.is_main) ?? loadedAccounts[0];

        if (isActive) {
          setAccounts(loadedAccounts);
          setSelectedAccountIds(defaultAccount ? [defaultAccount.id] : []);
        }
      } catch (loadError) {
        if (isActive) {
          setError(loadError instanceof Error ? loadError.message : 'Could not load trading accounts.');
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadTradingAccounts();

    return () => {
      isActive = false;
    };
  }, []);

  function toggleAccount(accountId: string) {
    setSelectedAccountIds((current) => {
      if (current.includes(accountId)) {
        return current.length === 1 ? current : current.filter((selectedId) => selectedId !== accountId);
      }

      return [...current, accountId];
    });
  }

  const selectedAccounts = useMemo(
    () => accounts.filter((account) => selectedAccountIds.includes(account.id)),
    [accounts, selectedAccountIds]
  );
  const value = useMemo<AccountScopeContextValue>(
    () => ({
      accounts,
      error,
      isLoading,
      selectedAccountIds,
      selectedAccounts,
      toggleAccount
    }),
    [accounts, error, isLoading, selectedAccountIds, selectedAccounts]
  );

  return <AccountScopeContext.Provider value={value}>{children}</AccountScopeContext.Provider>;
}

export function useAccountScope() {
  const value = useContext(AccountScopeContext);

  if (!value) {
    throw new Error('useAccountScope must be used inside AccountScopeProvider.');
  }

  return value;
}
