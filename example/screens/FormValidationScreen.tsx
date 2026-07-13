/**
 * FormValidationScreen — フォーム検証パターンの見本画面（DS 本体ではなく「組み方」の教材）。
 * docs/patterns.md のスニペットはこのファイルの #region から verbatim 抜粋される
 * （scripts/lib/check-patterns-sync.ts が check:drift で同期を機械検査）。
 * 規範: blur で初回検証 → エラー中は change で即解除 → submit で全量検証。
 */

import { useMemo, useState } from "react";
import { AccessibilityInfo, KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import {
  Alert,
  Button,
  Checkbox,
  Header,
  Radio,
  Screen,
  Stack,
  Text,
  TextField,
  Toggle,
  useTheme,
} from "melta-app";

// #region snippet:validators
interface FormValues {
  name: string;
  email: string;
  capacity: string; // TextInput は文字列で保持し、検証時に数値解釈する
  visibility: string | undefined; // Radio 未選択は undefined
  notifyOnDone: boolean;
  agreed: boolean;
}

type FieldKey = "name" | "email" | "capacity" | "visibility" | "agreed";
type FieldErrors = Partial<Record<FieldKey, string>>;

// 軽量ヒューリスティック（RFC 完全準拠はしない）。正規化 + サーバー側検証を前提にする
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** 全フィールドの検証（pure）。エラーが無いフィールドはキーごと持たない。 */
function validate(values: FormValues): FieldErrors {
  const errors: FieldErrors = {};
  if (values.name.trim() === "") errors.name = "プロジェクト名を入力してください";
  const email = values.email.trim(); // 前後空白は入力ミス扱いせず、正規化してから判定する
  if (email === "") errors.email = "通知先メールアドレスを入力してください";
  else if (!EMAIL_RE.test(email)) errors.email = "メールアドレスの形式が正しくありません";
  const capacity = values.capacity.trim();
  if (capacity === "") errors.capacity = "定員を入力してください";
  // number-pad は paste・物理キーボードを制約しないので digits-only を正面から検査する
  // （Number() 変換だけだと "1e1" や "0x10" が通ってしまう）
  else if (!/^\d+$/.test(capacity) || Number(capacity) < 1 || Number(capacity) > 99)
    errors.capacity = "定員は 1〜99 の整数で入力してください";
  if (values.visibility == null) errors.visibility = "公開範囲を選択してください";
  if (!values.agreed) errors.agreed = "利用規約への同意が必要です";
  return errors;
}
// #endregion

const VISIBILITY_OPTIONS = [
  { label: "非公開", value: "private", description: "自分だけが閲覧できる" },
  { label: "リンク共有", value: "link", description: "リンクを知っているメンバーが閲覧できる" },
  { label: "全体公開", value: "public", description: "誰でも閲覧できる" },
];

export function FormValidationForm() {
  const { theme } = useTheme();
  const [values, setValues] = useState<FormValues>({
    name: "",
    email: "",
    capacity: "",
    visibility: undefined,
    notifyOnDone: true,
    agreed: false,
  });
  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // 検証は values からの純導出。エラー表示中に修正すると即座に消える（punish late, reward early）
  const errors = useMemo(() => validate(values), [values]);
  const touch = (key: FieldKey) => setTouched((prev) => ({ ...prev, [key]: true }));
  /** 値の更新は必ずここを通す — 編集が始まったら前回の成功表示は破棄する。 */
  const setField = <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    setSubmitted(false);
    setValues((prev) => ({ ...prev, [key]: value }));
  };
  /** blur 済み or 送信試行後だけエラーを見せる（入力途中に叱らない）。 */
  const shownError = (key: FieldKey) =>
    touched[key] === true || submitAttempted ? errors[key] : undefined;

  // #region snippet:submit-handler
  const handleSubmit = () => {
    setSubmitAttempted(true); // 以後は未 blur フィールドのエラーも表示する
    if (Object.keys(errors).length > 0) {
      // 視覚はサマリー Alert(variant="error")。liveRegion の無い iOS にも announce で伝える
      AccessibilityInfo.announceForAccessibility("入力内容を確認してください");
      return;
    }
    setSubmitted(false);
    setSubmitting(true); // 送信中は全フィールドを disabled にする（後出し編集で成功表示が嘘になるのを防ぐ）
    // 実アプリではここで API 呼び出し。見本ではダミー遅延で loading を見せる
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 800);
  };
  // #endregion

  return (
    <Stack gap="4">
      {/* #region snippet:field-blur */}
      <TextField
        label="プロジェクト名（必須）"
        value={values.name}
        onChangeText={(text) => setField("name", text)}
        placeholder="例: 道東撮影プロジェクト"
        variant={shownError("name") != null ? "error" : "default"}
        errorText={shownError("name")}
        onBlur={() => touch("name")}
        disabled={submitting}
      />
      <TextField
        label="通知先メールアドレス（必須）"
        value={values.email}
        onChangeText={(text) => setField("email", text)}
        placeholder="user@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        variant={
          shownError("email") != null
            ? "error"
            : touched.email === true && errors.email == null && values.email !== ""
              ? "success"
              : "default"
        }
        helperText="進捗の通知に使う。プロフィールには表示されない"
        errorText={shownError("email")}
        onBlur={() => touch("email")}
        disabled={submitting}
      />
      {/* #endregion */}
      <TextField
        label="定員（必須）"
        value={values.capacity}
        onChangeText={(text) => setField("capacity", text)}
        placeholder="1〜99"
        keyboardType="number-pad"
        variant={shownError("capacity") != null ? "error" : "default"}
        errorText={shownError("capacity")}
        onBlur={() => touch("capacity")}
        disabled={submitting}
      />
      {/* #region snippet:choice-errors */}
      <Radio
        label="公開範囲（必須）"
        options={VISIBILITY_OPTIONS}
        value={values.visibility}
        onChange={(value) => setField("visibility", value)}
        error={shownError("visibility")}
        disabled={submitting}
      />
      <Toggle
        value={values.notifyOnDone}
        onValueChange={(value) => setField("notifyOnDone", value)}
        label="完了時に通知する（任意）"
        disabled={submitting}
      />
      <Stack gap="1">
        <Checkbox
          label="利用規約に同意する（必須）"
          checked={values.agreed}
          onChange={(checked) => setField("agreed", checked)}
          error={shownError("agreed") != null}
          disabled={submitting}
        />
        {/* Checkbox は errorText を持たないため、隣接 Text で必ず文言でも伝える
            （FORM_NO_COLOR_ONLY_ERROR = 色だけで伝えない）。View の liveRegion で
            出現も通知する（melta Text は a11y props を透過しない） */}
        {shownError("agreed") != null && (
          <View accessibilityLiveRegion="polite">
            <Text variant="xs" style={{ color: theme.color.status.danger.base }}>
              {shownError("agreed")}
            </Text>
          </View>
        )}
      </Stack>
      {/* #endregion */}
      {/* #region snippet:submit-button */}
      {submitAttempted && Object.keys(errors).length > 0 && (
        <Alert
          variant="error"
          title="入力内容を確認してください"
          message={Object.values(errors).join("\n")}
        />
      )}
      {submitted && (
        <Alert
          variant="success"
          message="プロジェクトを作成しました"
          onClose={() => setSubmitted(false)}
        />
      )}
      {/* 送信は常時活性（なぜ押せないかを伝えられない disabled-until-valid にしない）。
          二重送信だけ loading で防ぐ */}
      <Button label="プロジェクトを作成" onPress={handleSubmit} loading={submitting} />
      {/* #endregion */}
    </Stack>
  );
}

// #region snippet:keyboard-shell
export function FormValidationScreen() {
  const { theme } = useTheme();
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Screen(variant="scroll") は keyboardShouldPersistTaps を公開していないため、
          フォーム画面は fixed + 自前 ScrollView で組む。"handled" にしないと
          キーボード表示中の送信ボタンが 1 タップ目で反応しない（dismiss に食われる） */}
      <Screen variant="fixed" padding="none" header={<Header title="新規プロジェクト" />}>
        <ScrollView
          contentContainerStyle={{ padding: theme.spacing["4"] }}
          keyboardShouldPersistTaps="handled"
        >
          <FormValidationForm />
        </ScrollView>
      </Screen>
    </KeyboardAvoidingView>
  );
}
// #endregion
