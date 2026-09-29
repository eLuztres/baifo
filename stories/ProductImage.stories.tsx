import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import ProductMedia from '@/components/ProductMedia';

const meta: Meta<typeof ProductMedia> = {
    title: 'Components/ProductImage',
    component: ProductMedia,
    parameters: {
        layout: 'centered',
    },
};

export default meta;

type Story = StoryObj<typeof ProductMedia>;

export const ImageExample: Story = {
    args: {
        src: 'https://qh574vhljf.ufs.sh/f/oed4T9m4ChFS8pHshmDOG0F3Y1fCrQtcqEHwzp2e9SnsKjRm',
        alt: 'Example product image',
        width: 200,
        height: 200,
        className: 'w-40 h-40',
    },
};

export const VideoExample: Story = {
    args: {
        src: 'https://qh574vhljf.ufs.sh/f/oed4T9m4ChFSf229vPR2nF81mbK9kjsPlZG5iX3hr7yVUvMD',
        alt: 'Example product video',
        width: 320,
        height: 180,
        className: 'w-80 h-44',
        poster: 'https://qh574vhljf.ufs.sh/f/oed4T9m4ChFS8pHshmDOG0F3Y1fCrQtcqEHwzp2e9SnsKjRm',
    },
};
