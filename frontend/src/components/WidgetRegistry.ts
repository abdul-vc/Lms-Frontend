import React from 'react';
import {
  PendingRegistrationsWidget,
  OrgActivitySummaryWidget,
  ModuleStatusSummaryWidget,
  DailyStreakWidget,
  ContinueLearningWidget,
  BrowseCatalogWidget,
  LeaderboardWidget,
  BadgesEarnedWidget,
  ActiveUsersCountWidget,
} from './widgets';

export const WIDGET_REGISTRY: Record<string, React.ComponentType<any>> = {
  pending_registrations_count: PendingRegistrationsWidget,
  org_activity_summary: OrgActivitySummaryWidget,
  module_status_summary: ModuleStatusSummaryWidget,
  active_users_count: ActiveUsersCountWidget,
  daily_streak: DailyStreakWidget,
  continue_learning: ContinueLearningWidget,
  browse_catalog: BrowseCatalogWidget,
  leaderboard: LeaderboardWidget,
  badges_earned: BadgesEarnedWidget,
};
