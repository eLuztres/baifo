import {Meta, StoryObj} from '@storybook/nextjs-vite';
import LoaderImage from "@/components/shared/LoaderImage";

const meta: Meta<typeof LoaderImage> = {
    title: 'Components/LoaderImage',
    component: LoaderImage,
    parameters: {
        layout: 'centered',
    },
};
export default meta;

type Story = StoryObj<typeof LoaderImage>;

const baseArgs = {

};



export const Default: Story = {
    args: {
      ...baseArgs
    },
};








