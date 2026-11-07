import { lazyRouteComponent } from '@tanstack/react-router';

export const AppEntry = lazyRouteComponent(() => import('../../App'));