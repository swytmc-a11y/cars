import { z } from 'zod';
export const uuid=z.string().uuid(); export const money=z.number().nonnegative().finite(); export const currency=z.string().length(3).default('SAR');
