import React from 'react';
import Image from "next/image";
import loader from "@/assets/loader.png";

import styles from './LoaderImage.module.css';

const LoaderImage = () => {
    return (
            <Image src={loader} height={150} width={150} alt='Loading...'   className={styles.loaderSpin} />

    );
};

export default LoaderImage;