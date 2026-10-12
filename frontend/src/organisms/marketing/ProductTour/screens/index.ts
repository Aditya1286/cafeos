import type { ComponentType } from 'react';
import type { TourScreenId } from '@/constants/productTour';
import { GuestScreen } from './GuestScreen';
import { KitchenScreen } from './KitchenScreen';
import { OrdersScreen } from './OrdersScreen';
import { TablesScreen } from './TablesScreen';
import { NumbersScreen } from './NumbersScreen';

export const TOUR_SCREENS: Record<TourScreenId, ComponentType> = {
  guest: GuestScreen,
  kitchen: KitchenScreen,
  orders: OrdersScreen,
  tables: TablesScreen,
  numbers: NumbersScreen,
};
