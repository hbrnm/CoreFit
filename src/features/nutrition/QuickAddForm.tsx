import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { DOMAIN } from '../../lib/domains';

const D = DOMAIN.nutrition;

const schema = z.object({
  name: z.string().optional(),
  kcal: z.coerce.number().min(1, 'Minim 1').max(10000, 'Maxim 10000'),
  protein: z.coerce.number().min(0, 'Minim 0').max(1000, 'Maxim 1000'),
  carbs: z.coerce.number().min(0, 'Minim 0').max(1000, 'Maxim 1000'),
  fat: z.coerce.number().min(0, 'Minim 0').max(1000, 'Maxim 1000'),
  sodium: z.coerce.number().min(0, 'Minim 0').max(20000, 'Maxim 20000'),
});


export type QuickAddFormValues = z.infer<typeof schema>;

interface Props {
  onAdd: (values: QuickAddFormValues) => Promise<void>;
}

export function QuickAddForm({ onAdd }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      kcal: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      sodium: 0,
    },
  });

  const onSubmit = async (data: QuickAddFormValues) => {
    await onAdd(data);
    reset();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
      <p className="text-[15px] text-fg">Pentru mâncarea la care știi doar aproximativ valorile.</p>
      
      <div>
        <label className="label" htmlFor="q-name">
          Nume (opțional)
        </label>
        <input id="q-name" className="field" {...register('name')} />
        {errors.name && <p className="text-sm text-danger mt-1">{errors.name.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {(
          [
            ['kcal', 'Calorii (kcal)'],
            ['protein', 'Proteine (g)'],
            ['carbs', 'Carbohidrați (g)'],
            ['fat', 'Grăsimi (g)'],
            ['sodium', 'Sodiu (mg)'],
          ] as const
        ).map(([key, label]) => (
          <div key={key}>
            <label className="label" htmlFor={`q-${key}`}>
              {label}
            </label>
            <input
              id={`q-${key}`}
              className="field"
              inputMode="decimal"
              {...register(key)}
            />
            {errors[key] && <p className="text-sm text-danger mt-1">{errors[key]?.message as string}</p>}
          </div>
        ))}
      </div>
      
      <button type="submit" disabled={isSubmitting} className={`btn ${D.solid}`}>
        {isSubmitting ? 'Se adaugă...' : 'Adaugă'}
      </button>
    </form>
  );
}
