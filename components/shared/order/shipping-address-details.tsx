import { ShippingAddress } from '@/types';

interface ShippingAddressDetailsProps {
  address: ShippingAddress;
}

export default function ShippingAddressDetails({ address }: ShippingAddressDetailsProps) {
  return (
    <>
      <p>{address.fullName}</p>
      <p className='mb-2'>
        {address.streetAddress}, {address.city} {address.postalCode}, {address.country}
      </p>
    </>
  );
}
