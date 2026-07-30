import { createFileRoute } from '@tanstack/react-router';
import { LoginPage } from '@/components/LoginPage';

export const Route = createFileRoute('/login/$orgSlug')({
  component: LoginRouteWithSlug,
});

function LoginRouteWithSlug() {
  const { orgSlug } = Route.useParams();
  return <LoginPage orgSlug={orgSlug} />;
}
