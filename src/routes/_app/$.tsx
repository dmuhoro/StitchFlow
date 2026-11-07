import { createFileRoute } from '@tanstack/react-router';
import { AppEntry } from './-entry';

export const Route = createFileRoute('/_app/$')({ component: AppEntry });