// Interface language (TZ p.2: "архитектура должна позволять добавить азербайджанский язык
// интерфейса"). This only covers UI chrome — labels, buttons, messages. It never touches
// the Azerbaijani phrase TEXT being recorded (task.text, command phrases): that's task
// content, not interface language, and stays exactly as entered in the admin panel.
import { createContext, ReactNode, useContext, useEffect, useState } from "react";

export type Lang = "ru" | "az";

const STORAGE_KEY = "azstt_lang";

const dict = {
  ru: {
    "nav.commands": "Команды",
    "nav.moderation": "Модерация и экспорт",
    "nav.logout": "Выйти",

    "home.lead": "Сбор голосовых записей азербайджанских команд управления музыкой — для обучения компактной офлайн-модели распознавания. Спасибо, что помогаете собрать данные!",
    "home.start": "Начать запись",
    "home.statCommands": "команд",
    "home.statRecordings": "записей",
    "home.statPending": "на проверке",
    "home.rulesLink": "Правила участия и согласие на обработку голосовых данных",
    "home.myRecordings": "Мои записи",

    "status.pending": "Ожидает проверки",
    "status.approved": "Принята",
    "status.rejected": "Отклонена",
    "status.needs_review": "Требует проверки",
    "status.active": "активна",
    "status.disabled": "отключена",
    "status.archived": "в архиве",

    "consent.title": "Правила участия",
    "consent.p1": "Мы записываем короткие голосовые фразы для создания набора данных, по которому в будущем будет обучена офлайн-модель распознавания азербайджанских голосовых команд управления музыкой. Запись не содержит вашего имени — участник идентифицируется случайным кодом, без каких-либо личных данных.",
    "consent.p2": "Вы можете в любой момент прекратить участие. Запросить удаление уже сохранённых записей можно, обратившись к организатору проекта.",
    "consent.collection": "Я согласен(на) на запись и сбор моего голоса для этого проекта",
    "consent.collectionRequired": "(обязательно)",
    "consent.training": "Разрешаю использовать мои записи для обучения модели распознавания речи",
    "consent.publicDist": "Разрешаю публичное распространение набора данных, включающего мои записи",
    "consent.error": "Не удалось сохранить согласие — проверьте соединение и попробуйте снова",
    "consent.submit": "Принять и продолжить",

    "record.progress": "Задание {i} из {n}",
    "record.state.idle": "Готово к записи",
    "record.state.requesting": "Запрашиваем доступ к микрофону…",
    "record.state.recording": "Идёт запись…",
    "record.state.recorded": "Запись готова — прослушайте перед отправкой",
    "record.state.error": "Ошибка микрофона",
    "record.recordBtn": "Записать",
    "record.stopBtn": "Остановить запись",
    "record.retryMicBtn": "Повторить",
    "record.rerecordBtn": "Перезаписать",
    "record.saveBtn": "Сохранить и продолжить",
    "record.savingBtn": "Сохранение…",
    "record.retrySendBtn": "Повторить отправку",
    "record.skipBtn": "Пропустить эту фразу",
    "record.loading": "Загрузка…",
    "record.loadErrorParticipant": "Не удалось зарегистрировать участника — проверьте соединение",
    "record.loadErrorTasks": "Не удалось загрузить список фраз — проверьте соединение",
    "record.reloadBtn": "Повторить",
    "record.noTasks": "Пока нет доступных фраз для записи. Загляните позже.",
    "record.backHome": "На главную",
    "record.allDoneTitle": "Все задания выполнены",
    "record.allDoneText": "Спасибо за участие! Можете начать заново — порядок фраз будет перемешан.",
    "record.restartBtn": "Начать снова",
    "record.saveErrorFallback": "Не удалось сохранить запись — проверьте соединение и повторите",

    "adminLogin.title": "Вход в административный раздел",
    "adminLogin.placeholder": "Admin-токен",
    "adminLogin.submit": "Войти",
    "adminLogin.error": "Неверный токен",

    "admin.title": "Управление командами",
    "admin.loadError": "Не удалось загрузить команды",
    "admin.newCommand": "Новая команда",
    "admin.codePlaceholder": "код (например volume_up)",
    "admin.titlePlaceholder": "название",
    "admin.phrasesPlaceholder": "фразы, по одной на строку",
    "admin.addCommand": "Добавить команду",
    "admin.createError": "Не удалось создать команду",
    "admin.status": "Статус:",
    "admin.editText": "Изменить текст",
    "admin.disable": "Отключить",
    "admin.enable": "Включить",
    "admin.recordingsCount": "{n} записей · версий: {v}",
    "admin.newPhrasePlaceholder": "новая фраза",
    "admin.addPhrase": "Добавить фразу",
    "admin.editPromptLabel": "Новый текст фразы (создаст новую версию):",

    "moderation.title": "Модерация записей",
    "moderation.loadError": "Не удалось загрузить записи",
    "moderation.exportTitle": "Экспорт датасета",
    "moderation.exportBtn": "Экспорт: {status}",
    "moderation.loadAudio": "Загрузить и прослушать",
    "moderation.approve": "Принять",
    "moderation.reject": "Отклонить",
    "moderation.needsReview": "На доп. проверку",
    "moderation.rejectPrompt": "Причина отклонения:",
    "moderation.rejectionReason": "Причина отклонения: {reason}",
    "moderation.noRecordings": "Нет записей со статусом «{status}»",
    "moderation.participant": "участник",
    "moderation.exportError": "Не удалось экспортировать датасет",
    "moderation.delete": "Удалить",
    "moderation.deleteConfirm": "Удалить запись безвозвратно? Это действие нельзя отменить.",
    "moderation.deleteError": "Не удалось удалить запись",
  },
  az: {
    "nav.commands": "Əmrlər",
    "nav.moderation": "Moderasiya və ixrac",
    "nav.logout": "Çıxış",

    "home.lead": "Musiqiyə nəzarət üçün Azərbaycan dilində səsli əmrlərin toplanması — kompakt oflayn tanıma modelinin öyrədilməsi üçün. Məlumatların toplanmasına kömək etdiyiniz üçün təşəkkürlər!",
    "home.start": "Qeydə almağa başla",
    "home.statCommands": "əmr",
    "home.statRecordings": "qeyd",
    "home.statPending": "yoxlamada",
    "home.rulesLink": "İştirak qaydaları və səs məlumatlarının emalına razılıq",
    "home.myRecordings": "Mənim qeydlərim",

    "status.pending": "Yoxlanılır",
    "status.approved": "Qəbul edildi",
    "status.rejected": "Rədd edildi",
    "status.needs_review": "Əlavə yoxlama lazımdır",
    "status.active": "aktiv",
    "status.disabled": "deaktiv",
    "status.archived": "arxivdə",

    "consent.title": "İştirak qaydaları",
    "consent.p1": "Biz Azərbaycan dilində musiqiyə nəzarət üçün səsli əmrləri tanıyan oflayn modelin gələcəkdə öyrədiləcəyi məlumat toplusunu yaratmaq üçün qısa səsli ifadələr qeyd edirik. Qeyddə adınız yoxdur — iştirakçı heç bir şəxsi məlumat olmadan təsadüfi kodla müəyyən edilir.",
    "consent.p2": "İstənilən vaxt iştirakı dayandıra bilərsiniz. Artıq saxlanılmış qeydlərin silinməsini layihənin təşkilatçısına müraciət edərək tələb edə bilərsiniz.",
    "consent.collection": "Bu layihə üçün səsimin qeydə alınmasına və toplanmasına razıyam",
    "consent.collectionRequired": "(məcburi)",
    "consent.training": "Qeydlərimin nitq tanıma modelinin öyrədilməsi üçün istifadəsinə icazə verirəm",
    "consent.publicDist": "Qeydlərimi əhatə edən məlumat toplusunun açıq yayılmasına icazə verirəm",
    "consent.error": "Razılığı saxlamaq mümkün olmadı — bağlantını yoxlayıb yenidən cəhd edin",
    "consent.submit": "Qəbul et və davam et",

    "record.progress": "{i} / {n} tapşırıq",
    "record.state.idle": "Qeydə hazırdır",
    "record.state.requesting": "Mikrofona giriş istənilir…",
    "record.state.recording": "Qeyd gedir…",
    "record.state.recorded": "Qeyd hazırdır — göndərmədən əvvəl dinləyin",
    "record.state.error": "Mikrofon xətası",
    "record.recordBtn": "Qeydə al",
    "record.stopBtn": "Qeydi dayandır",
    "record.retryMicBtn": "Yenidən cəhd et",
    "record.rerecordBtn": "Yenidən qeydə al",
    "record.saveBtn": "Saxla və davam et",
    "record.savingBtn": "Saxlanılır…",
    "record.retrySendBtn": "Yenidən göndər",
    "record.skipBtn": "Bu ifadəni keç",
    "record.loading": "Yüklənir…",
    "record.loadErrorParticipant": "İştirakçını qeydə almaq mümkün olmadı — bağlantını yoxlayın",
    "record.loadErrorTasks": "İfadələr siyahısını yükləmək mümkün olmadı — bağlantını yoxlayın",
    "record.reloadBtn": "Yenidən cəhd et",
    "record.noTasks": "Hələ qeyd üçün ifadə yoxdur. Sonra yenidən baxın.",
    "record.backHome": "Ana səhifəyə",
    "record.allDoneTitle": "Bütün tapşırıqlar tamamlandı",
    "record.allDoneText": "İştirakınıza görə təşəkkürlər! Yenidən başlaya bilərsiniz — ifadələrin sırası qarışdırılacaq.",
    "record.restartBtn": "Yenidən başla",
    "record.saveErrorFallback": "Qeydi saxlamaq mümkün olmadı — bağlantını yoxlayıb yenidən cəhd edin",

    "adminLogin.title": "Admin bölməyə giriş",
    "adminLogin.placeholder": "Admin token",
    "adminLogin.submit": "Daxil ol",
    "adminLogin.error": "Yanlış token",

    "admin.title": "Əmrlərin idarə edilməsi",
    "admin.loadError": "Əmrləri yükləmək mümkün olmadı",
    "admin.newCommand": "Yeni əmr",
    "admin.codePlaceholder": "kod (məsələn volume_up)",
    "admin.titlePlaceholder": "ad",
    "admin.phrasesPlaceholder": "ifadələr, hər sətirdə biri",
    "admin.addCommand": "Əmr əlavə et",
    "admin.createError": "Əmri yaratmaq mümkün olmadı",
    "admin.status": "Status:",
    "admin.editText": "Mətni dəyiş",
    "admin.disable": "Deaktiv et",
    "admin.enable": "Aktiv et",
    "admin.recordingsCount": "{n} qeyd · versiya: {v}",
    "admin.newPhrasePlaceholder": "yeni ifadə",
    "admin.addPhrase": "İfadə əlavə et",
    "admin.editPromptLabel": "İfadənin yeni mətni (yeni versiya yaradacaq):",

    "moderation.title": "Qeydlərin moderasiyası",
    "moderation.loadError": "Qeydləri yükləmək mümkün olmadı",
    "moderation.exportTitle": "Dataset ixracı",
    "moderation.exportBtn": "İxrac: {status}",
    "moderation.loadAudio": "Yüklə və dinlə",
    "moderation.approve": "Qəbul et",
    "moderation.reject": "Rədd et",
    "moderation.needsReview": "Əlavə yoxlamaya",
    "moderation.rejectPrompt": "Rədd səbəbi:",
    "moderation.rejectionReason": "Rədd səbəbi: {reason}",
    "moderation.noRecordings": "«{status}» statuslu qeyd yoxdur",
    "moderation.participant": "iştirakçı",
    "moderation.exportError": "Dataset ixrac edilə bilmədi",
    "moderation.delete": "Sil",
    "moderation.deleteConfirm": "Qeyd həmişəlik silinsin? Bu geri qaytarıla bilməz.",
    "moderation.deleteError": "Qeydi silmək mümkün olmadı",
  },
} satisfies Record<Lang, Record<string, string>>;

export type TKey = keyof typeof dict["ru"];

// Category titles for the seeded commands (TZ p.6) — a command created later through the
// admin panel has no entry here, so AZ falls back to whatever title the API returned
// (usually Russian, since that's what the admin form collects today).
const COMMAND_TITLES_AZ: Record<string, string> = {
  play: "Oxutma",
  pause: "Pauza",
  stop: "Tam dayandırma",
  resume: "Davam etdirmə",
  next: "Növbəti trek",
  previous: "Əvvəlki trek",
  volume_up: "Səsi artırma",
  volume_down: "Səsi azaltma",
  mute: "Səsi söndürmə",
  unmute: "Səsi açma",
};

export function localizedCommandTitle(lang: Lang, code: string, fallbackTitle: string): string {
  if (lang === "az") return COMMAND_TITLES_AZ[code] ?? fallbackTitle;
  return fallbackTitle;
}

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  // Accepts a plain string (not just TKey) so dynamic keys built at runtime — e.g.
  // `status.${recording.status}` — type-check without a cast; unknown keys fall back to
  // themselves below, so a typo is visible in the UI instead of silently swallowed.
  t: (key: TKey | (string & {}), vars?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function readStoredLang(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "az" ? "az" : "ru";
  } catch {
    return "ru";
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readStoredLang);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  function setLang(next: Lang) {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage недоступен (приватный режим и т.п.) — выбор не сохранится между визитами
    }
  }

  function t(key: TKey | (string & {}), vars?: Record<string, string | number>): string {
    const table = dict[lang] as Record<string, string>;
    let text: string = table[key] ?? (dict.ru as Record<string, string>)[key] ?? key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        text = text.replace(`{${k}}`, String(v));
      }
    }
    return text;
  }

  return <LanguageContext.Provider value={{ lang, setLang, t }}>{children}</LanguageContext.Provider>;
}

export function useLang(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLang must be used within LanguageProvider");
  return ctx;
}

export function LanguageSwitcher() {
  const { lang, setLang } = useLang();
  return (
    <div className="lang-switcher" role="group" aria-label="Interface language">
      <button className={lang === "ru" ? "lang-active" : ""} onClick={() => setLang("ru")}>RU</button>
      <button className={lang === "az" ? "lang-active" : ""} onClick={() => setLang("az")}>AZ</button>
    </div>
  );
}
