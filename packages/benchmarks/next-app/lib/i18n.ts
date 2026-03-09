export type Locale = "en" | "es" | "fr" | "de" | "ja";

const DEFAULT_LOCALE: Locale = "en";

type TranslationMap = Record<string, string>;
type TranslationCatalog = Partial<Record<Locale, TranslationMap>>;

const translations: TranslationCatalog = {
  en: {
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.delete": "Delete",
    "common.edit": "Edit",
    "common.loading": "Loading...",
    "common.error": "Something went wrong",
    "common.success": "Success",
    "common.confirm": "Are you sure?",
    "auth.login": "Sign In",
    "auth.logout": "Sign Out",
    "auth.signup": "Create Account",
    "nav.dashboard": "Dashboard",
    "nav.settings": "Settings",
    "nav.bookings": "Bookings",
    "nav.integrations": "Integrations",
  },
  es: {
    "common.save": "Guardar",
    "common.cancel": "Cancelar",
    "common.delete": "Eliminar",
    "common.edit": "Editar",
    "common.loading": "Cargando...",
    "auth.login": "Iniciar Sesión",
    "auth.logout": "Cerrar Sesión",
  },
};

let currentLocale: Locale = DEFAULT_LOCALE;

export function setLocale(locale: Locale): void {
  currentLocale = locale;
}

export function getLocale(): Locale {
  return currentLocale;
}

export function t(
  key: string,
  params?: Record<string, string | number>,
): string {
  const map = translations[currentLocale] ?? translations[DEFAULT_LOCALE];
  let value = map?.[key] ?? key;

  if (params) {
    for (const [paramKey, paramValue] of Object.entries(params)) {
      value = value.replace(`{{${paramKey}}}`, String(paramValue));
    }
  }

  return value;
}

export function getSupportedLocales(): Locale[] {
  return Object.keys(translations) as Locale[];
}
