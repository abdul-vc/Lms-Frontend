import { createFileRoute } from '@tanstack/react-router';
import { BookOpen, CheckCircle2, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/super-admin/setup-guide')({
  component: SetupGuidePage,
});

function SetupGuidePage() {
  const steps = [
    {
      title: 'Configure Platform Branding',
      description: 'Set up your platform name, logo, and primary colors.',
      status: 'completed',
    },
    {
      title: 'Add First Organization',
      description: 'Create your first tenant organization to start onboarding users.',
      status: 'current',
    },
    {
      title: 'Configure Billing Plans',
      description: 'Define the subscription tiers and pricing for your tenants.',
      status: 'pending',
    },
    {
      title: 'Invite Organization Admins',
      description: 'Send invites to the administrators of your newly created organizations.',
      status: 'pending',
    },
  ];

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <div className="size-16 bg-emerald-500/15 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
          <BookOpen className="size-8 text-emerald-400" />
        </div>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Platform Setup Guide</h1>
        <p className="text-muted-foreground mt-2 max-w-md mx-auto text-sm font-medium">
          Follow these steps to get your multi-tenant LMS platform fully operational and ready for customers.
        </p>
      </div>

      <div className="bg-card/90 border border-border rounded-2xl p-8 shadow-xl">
        <div className="space-y-8 relative">
          {/* Vertical line connecting steps */}
          <div className="absolute left-[19px] top-4 bottom-4 w-px bg-muted" />

          {steps.map((step, index) => (
            <div key={index} className="flex gap-6 relative z-10">
              <div className="shrink-0 mt-0.5 bg-card rounded-full">
                {step.status === 'completed' ? (
                  <CheckCircle2 className="size-10 text-emerald-400" />
                ) : step.status === 'current' ? (
                  <div className="size-10 rounded-full border-2 border-emerald-500 flex items-center justify-center bg-emerald-500/10">
                    <div className="size-3 rounded-full bg-emerald-400" />
                  </div>
                ) : (
                  <Circle className="size-10 text-muted-foreground" />
                )}
              </div>
              
              <div className="pb-8">
                <h3 className={cn(
                  "text-lg font-bold mb-1",
                  step.status === 'completed' ? "text-foreground" : step.status === 'current' ? "text-emerald-400 font-extrabold" : "text-muted-foreground"
                )}>
                  {step.title}
                </h3>
                <p className="text-muted-foreground text-sm mb-4">
                  {step.description}
                </p>
                
                {step.status === 'current' && (
                  <button className="px-4 py-2 bg-emerald-600 text-foreground rounded-xl font-bold text-xs hover:bg-emerald-500 shadow-lg shadow-emerald-600/20 transition-all">
                    Start Step
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
