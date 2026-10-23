'use client';

import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';

interface SubmitButtonProps {
  label: string;
  pendingLabel: string;
}

/** Submit button of the sign-in and sign-up forms; useFormStatus only works inside the <form>. */
const SubmitButton = ({ label, pendingLabel }: SubmitButtonProps) => {
  const { pending } = useFormStatus();

  return (
    <Button disabled={pending} className='w-full' variant='default'>
      {pending ? pendingLabel : label}
    </Button>
  );
};

export default SubmitButton;
