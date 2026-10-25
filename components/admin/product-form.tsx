'use client';

import { useToast } from '@/hooks/use-toast';
import type { PriceClass } from '@/lib/constants';
import { productDefaultValues } from '@/lib/constants/form-defaults';
import { insertProductSchema } from '@/lib/validators';
import { Product } from '@/types';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { ControllerRenderProps, SubmitHandler, useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../ui/form';
import slugify from 'slugify';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { createProduct, updateProduct } from '@/lib/actions/product.actions';
import { UploadButton } from '@/lib/uploadthing';
import { preparePhotos } from '@/lib/prepare-photos';
import { Card, CardContent } from '../ui/card';
import Image from 'next/image';
import { Checkbox } from '../ui/checkbox';
import ProductMedia from "@/components/ProductMedia";
import { useI18n } from '@/components/i18n-provider';
import DescriptionFromInfo from './description-from-info';

type ProductFormValues = z.infer<typeof insertProductSchema>;

/** A category of the store's ring the product can show up in. */
export interface ProductFormCategory {
  id: string;
  name: string;
}

type ProductFormProps = {
  priceClasses: PriceClass[];
  storeCategories: ProductFormCategory[];
  /** The photos before the last AI redo, so it can be undone. */
  previousImages?: string[];
} & (
  | { type: 'Create'; product?: undefined }
  | { type: 'Update'; product: Product }
);

const ProductForm = ({ type, product, priceClasses, storeCategories, previousImages = [] }: ProductFormProps) => {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useI18n();

  // One schema for both modes: updateProduct gets the id separately.
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(insertProductSchema),
    defaultValues: product ?? productDefaultValues,
  });

  const onSubmit: SubmitHandler<ProductFormValues> = async (values) => {
    const res =
      type === 'Update'
        ? await updateProduct({ ...values, id: product.id })
        : await createProduct(values);

    if (!res.success) {
      toast({ variant: 'destructive', description: res.message });
      return;
    }
    toast({ description: res.message });
    router.push('/admin/products');
  };

  const showUploadError = () => {
    toast({ variant: 'destructive', description: t('STUDIO_UPLOAD_FAILED') });
  };

  // Leaving with changes not saved yet asks first.
  const hasUnsaved = form.formState.isDirty && !form.formState.isSubmitSuccessful;
  useEffect(() => {
    if (!hasUnsaved) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [hasUnsaved]);

  const images = form.watch('images');
  const isFeatured = form.watch('isFeatured');
  const banner = form.watch('banner');
  const priceClass = form.watch('priceClass');
  const categoryIds = form.watch('categoryIds') ?? [];

  const toggleCategory = (id: string, isChecked: boolean) =>
    form.setValue(
      'categoryIds',
      isChecked ? [...categoryIds, id] : categoryIds.filter((categoryId) => categoryId !== id),
      { shouldDirty: true }
    );

  const handlePriceClassChange = (name: string) => {
    const selected = priceClasses.find((item) => item.name === name);
    form.setValue('priceClass', selected?.name ?? null);
    if (selected) form.setValue('price', selected.price);
  };

  return (
    <Form {...form}>
      <form
        method='POST'
        onSubmit={form.handleSubmit(onSubmit)}
        className='space-y-8'
      >
        <div className='flex flex-col md:flex-row gap-5'>
          {/* Name */}
          <FormField
            control={form.control}
            name='name'
            render={({
              field,
            }: {
              field: ControllerRenderProps<ProductFormValues, 'name'>;
            }) => (
              <FormItem className='w-full'>
                <FormLabel>{t('FIELD_NAME')}</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {/* Slug */}
          <FormField
            control={form.control}
            name='slug'
            render={({
              field,
            }: {
              field: ControllerRenderProps<ProductFormValues, 'slug'>;
            }) => (
              <FormItem className='w-full'>
                <FormLabel>{t('FIELD_SLUG')}</FormLabel>
                <FormControl>
                  <div className='relative'>
                    <Input {...field} />
                    <Button
                      type='button'
                      variant='secondary'
                      className='px-4 py-1 mt-2'
                      onClick={() => {
                        form.setValue(
                          'slug',
                          slugify(form.getValues('name'), { lower: true })
                        );
                      }}
                    >
                      {t('PRODUCT_FORM_GENERATE')}
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className='flex flex-col md:flex-row gap-5'>
          {/* Category */}
          <FormField
            control={form.control}
            name='category'
            render={({
              field,
            }: {
              field: ControllerRenderProps<ProductFormValues, 'category'>;
            }) => (
              <FormItem className='w-full'>
                <FormLabel>{t('FIELD_CATEGORY')}</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {/* Brand */}
          <FormField
            control={form.control}
            name='brand'
            render={({
              field,
            }: {
              field: ControllerRenderProps<ProductFormValues, 'brand'>;
            }) => (
              <FormItem className='w-full'>
                <FormLabel>{t('FIELD_BRAND')}</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        {storeCategories.length > 0 && (
          <FormItem className='w-full'>
            <FormLabel>{t('PRODUCT_FORM_STORE_CATEGORIES')}</FormLabel>
            <div className='flex flex-wrap gap-x-5 gap-y-2'>
              {storeCategories.map((category) => (
                <label key={category.id} className='flex items-center gap-2 text-sm'>
                  <Checkbox
                    checked={categoryIds.includes(category.id)}
                    onCheckedChange={(checked) => toggleCategory(category.id, checked === true)}
                  />
                  {category.name}
                </label>
              ))}
            </div>
          </FormItem>
        )}
        {priceClasses.length > 0 && (
          <FormItem className='w-full'>
            <FormLabel>{t('PRODUCT_FORM_PRICE_CLASS')}</FormLabel>
            <select
              value={priceClass ?? ''}
              onChange={(event) => handlePriceClassChange(event.target.value)}
              className='border-input bg-background h-9 w-full rounded-md border px-3 text-sm'
            >
              <option value=''>{t('PRODUCT_FORM_NO_PRICE_CLASS')}</option>
              {priceClasses.map((item) => (
                <option key={item.name} value={item.name}>
                  {item.name} ({item.price})
                </option>
              ))}
            </select>
          </FormItem>
        )}
        <div className='flex flex-col md:flex-row gap-5'>
          {/* Price */}
          <FormField
            control={form.control}
            name='price'
            render={({
              field,
            }: {
              field: ControllerRenderProps<ProductFormValues, 'price'>;
            }) => (
              <FormItem className='w-full'>
                <FormLabel>{t('FIELD_PRICE')}</FormLabel>
                <FormControl>
                  <Input inputMode='decimal' readOnly={Boolean(priceClass)} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {/* Stock */}
          <FormField
            control={form.control}
            name='stock'
            render={({
              field,
            }: {
              field: ControllerRenderProps<ProductFormValues, 'stock'>;
            }) => (
              <FormItem className='w-full'>
                <FormLabel>{t('FIELD_STOCK')}</FormLabel>
                <FormControl>
                  <Input inputMode='numeric' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className='upload-field flex flex-col md:flex-row gap-5'>
          {/* Images */}
          <FormField
            control={form.control}
            name='images'
            render={() => (
              <FormItem className='w-full'>
                <FormLabel>{t('FIELD_IMAGES')}</FormLabel>
                <Card>
                  <CardContent className='space-y-2 mt-2 min-h-48'>
                    <div className='flex-start space-x-2'>
                      {images.map((image) => (
                        <ProductMedia
                          key={image}
                          src={image}
                          alt={t('FIELD_IMAGES')}
                          className='w-20 h-20 object-cover object-center rounded-sm'
                          width={100}
                          height={100}
                        />
                      ))}
                      <FormControl>
                        <UploadButton
                          endpoint='imageUploader'
                          onBeforeUploadBegin={preparePhotos}
                          onClientUploadComplete={(files) => {
                            if (files[0]) form.setValue('images', [...images, files[0].ufsUrl]);
                          }}
                          onUploadError={showUploadError}
                        />
                      </FormControl>
                    </div>
                    {previousImages.length > 0 && (
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        onClick={() => form.setValue('images', previousImages, { shouldDirty: true })}
                      >
                        {t('PRODUCT_FORM_RESTORE_PHOTOS')}
                      </Button>
                    )}
                  </CardContent>
                </Card>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className='upload-field'>
          {/* isFeatured */}
          {t('PRODUCT_FORM_FEATURED')}
          <Card>
            <CardContent className='space-y-2 mt-2'>
              <FormField
                control={form.control}
                name='isFeatured'
                render={({ field }) => (
                  <FormItem className='space-x-2 items-center'>
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel>{t('PRODUCT_FORM_IS_FEATURED')}</FormLabel>
                  </FormItem>
                )}
              />
              {isFeatured && banner && (
                <Image
                  src={banner}
                  alt={t('PRODUCT_FORM_BANNER')}
                  className='w-full object-cover object-center rounded-sm'
                  width={1920}
                  height={680}
                />
              )}

              {isFeatured && !banner && (
                <UploadButton
                  endpoint='imageUploader'
                  onBeforeUploadBegin={preparePhotos}
                  onClientUploadComplete={(files) => {
                    if (files[0]) form.setValue('banner', files[0].ufsUrl);
                  }}
                  onUploadError={showUploadError}
                />
              )}
            </CardContent>
          </Card>
        </div>
        <div>
          {/* Description */}
          <FormField
            control={form.control}
            name='description'
            render={({
              field,
            }: {
              field: ControllerRenderProps<ProductFormValues, 'description'>;
            }) => (
              <FormItem className='w-full'>
                <FormLabel>{t('FIELD_DESCRIPTION')}</FormLabel>
                <DescriptionFromInfo
                  productImage={images[0]}
                  onDescription={(text) => form.setValue('description', text, { shouldDirty: true })}
                />
                <FormControl>
                  <Textarea
                    className='resize-none'
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        {/* Always in sight at the bottom of a long form, with a word when there are changes still to save. */}
        <div className='sticky bottom-4 z-10 flex items-center gap-3 rounded-full border border-border bg-card/95 p-2 pl-5 shadow-xl backdrop-blur'>
          <p role='status' className='min-w-0 flex-1 truncate text-sm text-muted-foreground'>
            {hasUnsaved && t('FORM_UNSAVED')}
          </p>
          <Button
            type='submit'
            size='lg'
            disabled={form.formState.isSubmitting}
            className='shrink-0 rounded-full'
          >
            {form.formState.isSubmitting
              ? t('FORM_SAVING')
              : t(type === 'Create' ? 'ADMIN_CREATE_PRODUCT' : 'ADMIN_UPDATE_PRODUCT')}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default ProductForm;
