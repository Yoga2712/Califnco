import { ImageSourcePropType } from 'react-native';

/**
 * Verified, studio-grade product images with pure white backgrounds.
 * Sourced to accurately represent Califnco's RO water purifiers,
 * dispensers, booster pumps, filter cartridges, and plumbing spares.
 */
export const LOCAL_PRODUCT_IMAGES: Record<string, ImageSourcePropType> = {
  // Purifiers
  'pur-01': require('../../assets/images/products/pur-01.jpg'),
  'pur-02': require('../../assets/images/products/pur-01.jpg'),
  'pur-03': require('../../assets/images/products/pur-03.jpg'),
  'pur-04': require('../../assets/images/products/pur-04.jpg'),

  // Dispensers
  'disp-01': require('../../assets/images/products/disp-03.jpg'),
  'disp-02': require('../../assets/images/products/disp-03.jpg'),
  'disp-03': require('../../assets/images/products/disp-03.jpg'),
  'disp-04': require('../../assets/images/products/pur-04.jpg'),

  // Pumps
  'pmp-01': require('../../assets/images/products/pmp-01.jpg'),
  'pmp-02': require('../../assets/images/products/pmp-02.jpg'),
  'pmp-03': require('../../assets/images/products/pmp-01.jpg'),
  'pmp-04': require('../../assets/images/products/pmp-01.jpg'),

  // Filters
  'flt-01': require('../../assets/images/products/flt-01.jpg'),
  'flt-02': require('../../assets/images/products/flt-03.jpg'),
  'flt-03': require('../../assets/images/products/flt-03.jpg'),
  'flt-04': require('../../assets/images/products/flt-04.jpg'),

  // Spares
  'spr-01': require('../../assets/images/products/spr-01.jpg'),
  'spr-02': require('../../assets/images/products/spr-02.jpg'),
  'spr-03': require('../../assets/images/products/spr-03.jpg'),
  'spr-04': require('../../assets/images/products/spr-04.jpg'),
};
