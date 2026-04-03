'use client';

import * as React from 'react';
import { Check, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { LANGUAGES, useTranslation, type LanguageCode } from '@/hooks/use-translation';

interface LanguageSelectorProps {
  value?: LanguageCode;
  onChange?: (language: LanguageCode) => void;
  showFlag?: boolean;
  showName?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'outline' | 'ghost';
  className?: string;
  disabled?: boolean;
}

export function LanguageSelector({
  value,
  onChange,
  showFlag = true,
  showName = true,
  size = 'md',
  variant = 'outline',
  className,
  disabled = false,
}: LanguageSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const { currentLanguage, changeLanguage } = useTranslation();
  
  // Use controlled value or internal state
  const selectedLanguage = value || currentLanguage;
  
  // Find the selected language info
  const selectedLangInfo = LANGUAGES.find(l => l.code === selectedLanguage) || LANGUAGES[0];

  const handleSelect = (languageCode: string) => {
    const code = languageCode as LanguageCode;
    
    if (onChange) {
      onChange(code);
    } else {
      changeLanguage(code);
    }
    
    setOpen(false);
  };

  // Size classes
  const sizeClasses = {
    sm: 'h-8 text-xs px-2',
    md: 'h-10 text-sm px-3',
    lg: 'h-12 text-base px-4',
  };

  // Variant classes
  const variantClasses = {
    default: 'bg-[#6C63FF] hover:bg-[#6C63FF]/80 text-white',
    outline: 'border-[#2A2B32] bg-[#1E1F26] text-white hover:bg-[#2A2B32]',
    ghost: 'text-white hover:bg-[#2A2B32]',
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'justify-between font-normal',
            sizeClasses[size],
            variantClasses[variant],
            className
          )}
        >
          <span className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-[#6C63FF]" />
            {showFlag && <span className="text-base">{selectedLangInfo.flag}</span>}
            {showName && <span>{selectedLangInfo.name}</span>}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[240px] p-0 bg-[#1E1F26] border-[#2A2B32]"
        align="start"
      >
        <Command className="bg-transparent">
          <CommandInput 
            placeholder="Поиск языка..." 
            className="h-9 text-white placeholder:text-[#8A8A8A]"
          />
          <CommandList>
            <CommandEmpty className="py-2 text-center text-[#8A8A8A]">
              Язык не найден
            </CommandEmpty>
            <CommandGroup className="max-h-64 overflow-y-auto">
              {LANGUAGES.map((language) => (
                <CommandItem
                  key={language.code}
                  value={language.code}
                  keywords={[language.name, language.flag]}
                  onSelect={handleSelect}
                  className="flex items-center justify-between text-white hover:bg-[#2A2B32] aria-selected:bg-[#2A2B32]"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-base">{language.flag}</span>
                    <span>{language.name}</span>
                  </span>
                  {selectedLanguage === language.code && (
                    <Check className="h-4 w-4 text-[#6C63FF]" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// Compact version for inline use
export function LanguageSelectorCompact({
  value,
  onChange,
  className,
  disabled = false,
}: Omit<LanguageSelectorProps, 'showFlag' | 'showName' | 'size' | 'variant'>) {
  return (
    <LanguageSelector
      value={value}
      onChange={onChange}
      showFlag={true}
      showName={false}
      size="sm"
      variant="ghost"
      className={className}
      disabled={disabled}
    />
  );
}

// Full version with label for settings
export function LanguageSelectorFull({
  value,
  onChange,
  label = 'Язык интерфейса',
  description,
  className,
  disabled = false,
}: LanguageSelectorProps & {
  label?: string;
  description?: string;
}) {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium">{label}</p>
          {description && (
            <p className="text-sm text-[#8A8A8A]">{description}</p>
          )}
        </div>
        <LanguageSelector
          value={value}
          onChange={onChange}
          showFlag={true}
          showName={true}
          size="md"
          variant="outline"
          disabled={disabled}
        />
      </div>
    </div>
  );
}

export default LanguageSelector;
