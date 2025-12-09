'use client';

import { useStudioStore, CanvasComponent } from '@/stores/studio-store';
import { cn } from '@/lib/utils';
import { Trash2, Palette, Move, Plus } from 'lucide-react';

export function Canvas() {
  const { 
    components, 
    selectedComponentId, 
    device, 
    zoom,
    setSelectedComponent,
    deleteComponent,
    addComponent
  } = useStudioStore();

  const deviceClass = {
    desktop: 'device-desktop',
    tablet: 'device-tablet',
    mobile: 'device-mobile',
  }[device];

  const handleAddSection = () => {
    const newComponent: CanvasComponent = {
      id: `comp-${Date.now()}`,
      type: 'section',
      props: {
        className: 'py-16 px-8 bg-surface',
      },
      children: [
        {
          id: `comp-${Date.now()}-1`,
          type: 'heading',
          props: {
            text: 'New Section',
            level: 2,
            className: 'text-3xl font-bold text-white mb-4',
          },
        },
        {
          id: `comp-${Date.now()}-2`,
          type: 'paragraph',
          props: {
            text: 'Add your content here. Click to edit.',
            className: 'text-gray-400',
          },
        },
      ],
    };
    addComponent(newComponent);
  };

  return (
    <main className="flex-1 bg-background overflow-auto p-8">
      <div className="min-h-full flex items-start justify-center">
        <div
          className={cn(
            'bg-surface-light rounded-lg shadow-2xl overflow-hidden transition-all',
            deviceClass
          )}
          style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
        >
          {/* Browser Chrome */}
          <div className="bg-surface px-4 py-2 flex items-center space-x-2 border-b border-surface-light">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <div className="flex-1 ml-4">
              <div className="h-5 bg-background rounded-full w-1/2 mx-auto" />
            </div>
          </div>

          {/* Canvas Content */}
          <div className="min-h-[600px] canvas-grid">
            {components.length === 0 ? (
              <EmptyCanvas onAddSection={handleAddSection} />
            ) : (
              <div>
                {components.map((component) => (
                  <ComponentWrapper
                    key={component.id}
                    component={component}
                    isSelected={selectedComponentId === component.id}
                    onSelect={() => setSelectedComponent(component.id)}
                    onDelete={() => deleteComponent(component.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function EmptyCanvas({ onAddSection }: { onAddSection: () => void }) {
  return (
    <div className="h-[600px] flex flex-col items-center justify-center text-center p-8">
      <div className="w-16 h-16 bg-surface rounded-xl flex items-center justify-center mb-6">
        <Plus className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">
        Your canvas is empty
      </h3>
      <p className="text-gray-400 mb-6 max-w-sm">
        Start by adding a section, using a template, or telling the AI what you want to build.
      </p>
      <div className="flex space-x-3">
        <button
          onClick={onAddSection}
          className="px-4 py-2 bg-primary-700 hover:bg-primary-600 text-white rounded-lg transition-colors"
        >
          Add Section
        </button>
        <button className="px-4 py-2 bg-surface hover:bg-surface-light border border-surface-light text-white rounded-lg transition-colors">
          Use Template
        </button>
      </div>
    </div>
  );
}

interface ComponentWrapperProps {
  component: CanvasComponent;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

function ComponentWrapper({ 
  component, 
  isSelected, 
  onSelect, 
  onDelete 
}: ComponentWrapperProps) {
  return (
    <div
      className={cn(
        'component-wrapper relative group',
        isSelected && 'selected'
      )}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {/* Controls */}
      <div className={cn(
        'absolute -top-10 left-0 flex items-center space-x-1 bg-surface rounded-lg p-1 opacity-0 transition-opacity',
        'group-hover:opacity-100',
        isSelected && 'opacity-100'
      )}>
        <button 
          className="p-1.5 hover:bg-surface-light rounded text-gray-400 hover:text-white"
          title="Move"
        >
          <Move className="w-4 h-4" />
        </button>
        <button 
          className="p-1.5 hover:bg-surface-light rounded text-gray-400 hover:text-white"
          title="Style"
        >
          <Palette className="w-4 h-4" />
        </button>
        <button 
          className="p-1.5 hover:bg-surface-light rounded text-gray-400 hover:text-red-500"
          title="Delete"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Component Content */}
      <RenderComponent component={component} />
    </div>
  );
}

function RenderComponent({ component }: { component: CanvasComponent }) {
  const { type, props, children } = component;
  const className = (props.className as string) || '';

  switch (type) {
    case 'section':
      return (
        <section className={className}>
          {children?.map((child) => (
            <RenderComponent key={child.id} component={child} />
          ))}
        </section>
      );
    
    case 'heading':
      const HeadingTag = `h${(props.level as number) || 2}` as keyof JSX.IntrinsicElements;
      return <HeadingTag className={className}>{props.text as string}</HeadingTag>;
    
    case 'paragraph':
      return <p className={className}>{props.text as string}</p>;
    
    case 'button':
      return (
        <button className={className}>
          {props.text as string}
        </button>
      );
    
    case 'image':
      return (
        <img 
          src={props.src as string} 
          alt={props.alt as string || ''} 
          className={className}
        />
      );
    
    case 'div':
      return (
        <div className={className}>
          {children?.map((child) => (
            <RenderComponent key={child.id} component={child} />
          ))}
        </div>
      );

    default:
      return (
        <div className={cn('p-4 border border-dashed border-gray-500', className)}>
          Unknown component: {type}
        </div>
      );
  }
}
