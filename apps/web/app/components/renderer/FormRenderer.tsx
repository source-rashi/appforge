"use client";

import React, { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import toast from 'react-hot-toast';
import { useTable } from '../../lib/config-context';
import { apiPost } from '../../lib/api-client';
import type { FormComponentConfig, FieldConfig } from '@appforge/config-types';
import { useI18n } from '../../lib/i18n-context';

export function FormRenderer({ config, appId }: { config: FormComponentConfig; appId: string }) {
  const tableConfig = useTable(config.table);
  const { t } = useI18n();

  const fieldsToRender = useMemo(() => {
    if (!tableConfig) return [];
    if (config.fields && config.fields.length > 0) {
      return tableConfig.fields.filter(f => config.fields!.includes(f.name));
    }
    return tableConfig.fields;
  }, [tableConfig, config.fields]);

  const schema = useMemo(() => {
    const shape: Record<string, z.ZodTypeAny> = {};
    fieldsToRender.forEach(field => {
      let fieldSchema: z.ZodTypeAny;

      switch (field.type) {
        case 'string':
        case 'email':
        case 'enum':
        case 'relation':
          fieldSchema = z.string();
          break;
        case 'number':
          fieldSchema = z.coerce.number();
          break;
        case 'boolean':
          fieldSchema = z.boolean();
          break;
        case 'date':
          fieldSchema = z.string(); // or z.date()
          break;
        default:
          fieldSchema = z.any();
      }

      if (!field.required) {
        fieldSchema = fieldSchema.optional().or(z.literal(''));
      }

      shape[field.name] = fieldSchema;
    });

    return z.object(shape);
  }, [fieldsToRender]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(schema as any),
  });

  if (!tableConfig) {
    return <div className="text-red-500">Table config not found for {config.table}</div>;
  }

  const onSubmit = async (data: any) => {
    try {
      await apiPost(`/apps/${appId}/${config.table}`, data);
      toast.success('Submitted successfully');
      
      if (config.onSuccess === 'reset') {
        reset();
      } else if (config.onSuccess === 'redirect' && config.redirectTo) {
        window.location.href = config.redirectTo;
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'An error occurred';
      toast.error(msg);
      // Could set field errors if backend returns them
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 bg-white p-6 rounded-lg shadow-sm border border-gray-100">
      {fieldsToRender.map((field: FieldConfig) => (
        <div key={field.name} className="flex flex-col">
          <label className="mb-1 text-sm font-medium text-gray-700 capitalize">
            {field.name.replace(/_/g, ' ')}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>

          {field.type === 'boolean' ? (
            <input
              type="checkbox"
              {...register(field.name)}
              className="h-4 w-4 text-blue-600 rounded border-gray-300"
            />
          ) : field.type === 'enum' && field.options ? (
            <select
              {...register(field.name)}
              className="border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select...</option>
              {field.options.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          ) : (
            <input
              type={field.type === 'number' ? 'number' : field.type === 'email' ? 'email' : field.type === 'date' ? 'datetime-local' : 'text'}
              {...register(field.name)}
              className="border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
            />
          )}

          {errors[field.name] && (
            <span className="text-red-500 text-xs mt-1">
              {errors[field.name]?.message as string || 'Invalid value'}
            </span>
          )}
        </div>
      ))}

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {isSubmitting ? t('loading') : t(config.submitLabel || 'submit')}
      </button>
    </form>
  );
}
