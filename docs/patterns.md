# melta-app Form Patterns（フォームの組み方）

> フォーム構成の規範 + コピペ可能スニペット。スニペットは example/screens/FormValidationScreen.tsx
> からの抜粋で、`npm run check:drift` が実コードとの一致を機械検査する（手で fence を編集しない。
> 実装を変えたら fence を実装に合わせる）。web 版の規範は melta-ui patterns/form.md。

## 1. 原則

フォームは「入力者を信頼し、間違えたときだけ静かに助ける」方向で組む。melta-app の公開 API だけで成立する形を規範とし、form ライブラリは前提にしない。

| 原則 | 理由 |
|---|---|
| フィールドは縦積み（`Stack gap="4"`） | モバイル幅で横並びフィールドは折返し事故の温床。1 カラムが読む順序 = 入力順序になる |
| ラベルは入力欄の上 | `TextField` の `label`（必須 prop）が構造で強制する。placeholder をラベル代わりにしない |
| エラーはフィールド直下 | `errorText` / `Radio.error` が描画位置を固定する。離れた場所のサマリーだけに頼らない |
| 主要アクションは full-width | モバイルでは web の右寄せボタンを持ち込まない。`Stack` 直下の `Button` は stretch される |
| フォーム全体は `Stack gap="4"` | フィールド間隔はトークン経由。raw spacing は lint が落とす |

## 2. 検証タイミング — blur で検証し、change で赦し、submit で全量

1. **blur で初回検証**（touched フラグを立てる）— 入力途中に叱らない。
2. **エラー表示中は change で即時再評価** — errors は values からの `useMemo` 導出なので、修正した瞬間にエラーが消える（punish late, reward early）。
3. **submit で全量検証** — `submitAttempted` を立てて未 touch フィールドのエラーも表示し、フォームレベルのサマリーを Alert で出す。
4. **送信ボタンは disable しない** — 「なぜ押せないか」を伝えられないため。二重送信だけ `loading` で防ぎ、**送信中は全フィールドを `disabled={submitting}` でロックする**（後出し編集で成功表示が嘘になるのを防ぐ）。編集が再開されたら前回の成功表示は破棄する（`setField` に集約）。
5. **エラーはスクリーンリーダーにも伝える** — TextField / Radio の errorText は liveRegion（Android）+ accessibilityLabel 合成（再フォーカス時読み上げ）を内蔵。submit 失敗のサマリーは `AccessibilityInfo.announceForAccessibility` で iOS にも通知する（スニペット参照）。
5. **エラーの自動非表示はしない** — 修正されるまで表示し続ける（web 版 form.md の禁止パターンと同一規範）。

検証は state に持たず、values からの pure function 導出にする。これが規範 2 を無料にする。

<!-- snippet:validators source=example/screens/FormValidationScreen.tsx -->
```tsx
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
```

フィールド側は `onBlur` で touched を立て、`shownError(key)`（blur 済み or 送信試行後だけエラーを返す）で表示を制御する。「通った」ことを積極的に伝えたいフィールド（この見本ではメールアドレスのみ）は、valid かつ touched のとき `variant="success"` にする — 全フィールドに付ける必要はない。`helperText` と `errorText` は排他表示（TextField が内部で制御）。

<!-- snippet:field-blur source=example/screens/FormValidationScreen.tsx -->
```tsx
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
```

## 3. required の示し方

label 文字列に「（必須）」「（任意）」を明記する。web の赤アスタリスクは RN の `label: string` では表現できず、スクリーンリーダーの読み上げでも意味を成さないため、文字で書く。色だけの必須表示は禁止。任意フィールドが少数派なら「（任意）」だけを付ける形でもよいが、1 フォーム内で流儀を混ぜない。

## 4. エラーの伝え方（FORM_NO_COLOR_ONLY_ERROR）

色だけでエラーを伝えない。コンポーネントごとにテキスト表示の経路が違う:

| コンポーネント | エラー表示 |
|---|---|
| `TextField` | `variant="error"` + `errorText`（テキスト必須） |
| `Radio` | `error?: string` — 枠色 + メッセージ表示まで内蔵 |
| `Checkbox` | `error: boolean` のみ — **隣接 `Text` で文言を必ず併記**（errorText prop は無い） |
| フォームレベル | `Alert variant="error"`（サマリー）/ 成功は `variant="success"` |

エラーの自動非表示（数秒で消す等）は禁止。修正されるまで表示する。

<!-- snippet:choice-errors source=example/screens/FormValidationScreen.tsx -->
```tsx
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
```

## 5. keyboardType の選び方

入力内容に合ったキーボードを必ず指定する（`default` のまま数値やメールを打たせない）:

| 用途 | keyboardType | 併用 |
|---|---|---|
| 自由テキスト | `default` | — |
| メール | `email-address` | `autoCapitalize="none"` `autoCorrect={false}` |
| 整数（個数・回数） | `number-pad` | 値は string で保持し検証で数値化 |
| 小数（距離・金額） | `decimal-pad` | 同上 |
| 電話番号 | `phone-pad` | — |

※ `TextField` が RN `TextInput` へ透過するのは入力メソッド系 props（`keyboardType` / `autoCapitalize` / `autoCorrect` / `maxLength` / `returnKeyType` / `onSubmitEditing` / `onBlur` / `onFocus`）のみ。style 系 props は透過しない（token 純度維持）。

## 6. キーボード回避

現行公開 API での正攻法は **`KeyboardAvoidingView`（iOS のみ `behavior="padding"`）+ `Screen variant="fixed" padding="none"` + 自前 `ScrollView`** の組み合わせ。`Screen variant="scroll"` は `keyboardShouldPersistTaps` を公開していないため、キーボード表示中の送信ボタンが 1 タップ目で反応しない（タップがキーボード dismiss に食われる）。フォーム画面では自前 ScrollView に `keyboardShouldPersistTaps="handled"` を必ず付ける。padding は `theme.spacing` から取る（raw 値は lint が落とす）。

<!-- snippet:keyboard-shell source=example/screens/FormValidationScreen.tsx -->
```tsx
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
```

## 7. 送信ボタンの制御

送信ボタンは**常時活性**にする。disabled-until-valid は「なぜ押せないか」を伝えられず、a11y 的にも不利。押下時に全量検証してサマリー Alert で理由を見せる方が誠実。二重送信だけ `Button` の `loading`（Spinner + disabled 相当）で防ぐ。

<!-- snippet:submit-handler source=example/screens/FormValidationScreen.tsx -->
```tsx
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
```

<!-- snippet:submit-button source=example/screens/FormValidationScreen.tsx -->
```tsx
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
```

## 8. state 設計の最小形

form ライブラリを DS として強制しない。素の React で必要十分な最小形:

- state は 5 つ: `values` / `touched: Partial<Record<FieldKey, boolean>>` / `submitAttempted` / `submitting` / `submitted`
- `errors = useMemo(() => validate(values), [values])` — 検証結果は state に持たず、values からの純導出にする（エラー中の修正が即座に画面へ反映される）
- `shownError(key) = (touched[key] || submitAttempted) ? errors[key] : undefined` — 表示制御はこの 1 関数に集約
- 数値入力も `TextInput` の値は string で保持し、検証・送信時に数値解釈する

プロジェクト側で form ライブラリを使うのは自由だが、このパターン文書とカタログ見本は素の React を正とする。

## 9. 禁止パターン

| 禁止 | 理由 / 代替 |
|---|---|
| ラベル省略 | `TextField` は `label` 必須で型的に不可能。他コンポーネントでも省略しない |
| 色だけのエラー表示 | FORM_NO_COLOR_ONLY_ERROR。必ずテキストを併記（§4 の対応表） |
| エラーの自動非表示 | 修正されるまで表示する。トースト等で数秒だけ見せるのは不可 |
| disabled-until-valid の常用 | 「なぜ押せないか」を伝えられない。常時活性 + submit 時全量検証 + サマリー Alert |
| placeholder をラベル代わりにする | 入力を始めた瞬間に文脈が消える。placeholder は例示専用 |
| 生値スタイル（hex / 数値 spacing 直書き） | lint（--max-warnings 0）が落とす。`theme.color.*` / `theme.spacing[*]` 経由のみ |
