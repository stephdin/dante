import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type DisplaySettings = {
  showProviderStats: boolean;
  showTimestamps: boolean;
};

type DisplaySettingsContextType = {
  settings: DisplaySettings;
  updateSetting: <K extends keyof DisplaySettings>(
    key: K,
    value: DisplaySettings[K],
  ) => void;
};

const defaultSettings: DisplaySettings = {
  showProviderStats: false,
  showTimestamps: false,
};

const STORAGE_KEY = "dante-display-settings";

const DisplaySettingsContext = createContext<DisplaySettingsContextType | null>(
  null,
);

export function DisplaySettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<DisplaySettings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return defaultSettings;
      return { ...defaultSettings, ...JSON.parse(stored) };
    } catch {
      return defaultSettings;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  function updateSetting<K extends keyof DisplaySettings>(
    key: K,
    value: DisplaySettings[K],
  ) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <DisplaySettingsContext.Provider value={{ settings, updateSetting }}>
      {children}
    </DisplaySettingsContext.Provider>
  );
}

export function useDisplaySettings(): DisplaySettingsContextType {
  const context = useContext(DisplaySettingsContext);
  if (!context) {
    throw new Error(
      "useDisplaySettings must be used within a DisplaySettingsProvider",
    );
  }
  return context;
}
