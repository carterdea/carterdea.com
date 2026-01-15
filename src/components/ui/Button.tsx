import type { ComponentPropsWithoutRef } from 'react';

type ButtonProps = ComponentPropsWithoutRef<'button'> & {
  as?: 'button';
};

type AnchorProps = ComponentPropsWithoutRef<'a'> & {
  as: 'a';
};

type Props = ButtonProps | AnchorProps;

const baseClass =
  'bg-white/10 border-[0.5px] border-white/5 rounded-[3px] px-3 pt-2 pb-1 text-xs text-white tracking-[-0.24px] hover:bg-white/15 hover:border-white/10 active:scale-[0.97] active:bg-white/5 active:border-white/5 active:text-white/70 transition-all duration-150 disabled:opacity-50';

export default function Button(props: Props) {
  if (props.as === 'a') {
    const { as: _, className, ...rest } = props;
    return <a className={`${baseClass} ${className ?? ''}`} {...rest} />;
  }

  const { as: _, className, ...rest } = props;
  return <button className={`${baseClass} ${className ?? ''}`} {...rest} />;
}
