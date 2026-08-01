import { AuthForm } from "../components/organisms/AuthForm";
import { AuthTemplate } from "../components/templates";
export function AuthPage({ register = false }: { register?: boolean }) {
  return (
    <AuthTemplate>
      <AuthForm register={register} />
    </AuthTemplate>
  );
}
