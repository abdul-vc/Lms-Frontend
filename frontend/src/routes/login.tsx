import { createFileRoute } from '@tanstack/react-router';
import { LoginPage } from '@/components/LoginPage';

export const Route = createFileRoute('/login')({
  component: LoginRouteWithoutSlug,
});

function LoginRouteWithoutSlug() {
  return <LoginPage orgSlug={null} />;
}
