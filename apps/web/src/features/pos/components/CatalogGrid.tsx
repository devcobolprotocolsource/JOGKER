import { For, Show } from 'solid-js';
import { Money } from '../../../shared/ui/Money';
import { strings } from '../../../shared/strings';
import type { Category } from '../api/pos';
import type { MenuItem } from '../state/cart';

export function CatalogGrid(props: {
  categories: Category[];
  items: MenuItem[];
  activeCategory: string;
  onCategoryChange: (id: string) => void;
  onSelect: (item: MenuItem) => void;
}) {
  return (
    <section class="catalog-panel" aria-label={strings.pos.title}>
      <div class="catalog-categories" role="tablist" aria-label={strings.pos.categories}>
        <button
          type="button"
          role="tab"
          aria-selected={!props.activeCategory}
          classList={{ 'catalog-category--active': !props.activeCategory }}
          onClick={() => props.onCategoryChange('')}
        >
          {strings.pos.allCategories}
        </button>
        <For each={props.categories}>
          {(category) => (
            <button
              type="button"
              role="tab"
              aria-selected={props.activeCategory === category.id}
              classList={{
                'catalog-category--active': props.activeCategory === category.id,
              }}
              onClick={() => props.onCategoryChange(category.id)}
            >
              {category.name}
            </button>
          )}
        </For>
      </div>
      <div class="catalog-grid">
        <For each={props.items}>
          {(item, index) => (
            <button
              class="menu-tile"
              type="button"
              disabled={!item.is_available}
              aria-label={`${item.name}, ${strings.pos.shortcutItem} ${index() + 1}`}
              onClick={() => props.onSelect(item)}
            >
              <Show
                when={item.image_path}
                fallback={
                  <span class="menu-tile__image-placeholder" aria-hidden="true">
                    {item.name.slice(0, 1)}
                  </span>
                }
              >
                <img
                  class="menu-tile__image"
                  src={item.image_path ?? ''}
                  alt=""
                  width="240"
                  height="180"
                  loading="lazy"
                  decoding="async"
                />
              </Show>
              <span class="menu-tile__name">{item.name}</span>
              <Money value={item.price} />
              <Show when={!item.is_available}>
                <span class="menu-tile__sold-out">{strings.pos.unavailable}</span>
              </Show>
              <span class="sr-only">
                {strings.pos.shortcutItem} {index() + 1}
              </span>
            </button>
          )}
        </For>
      </div>
      <Show when={props.items.length === 0}>
        <p class="catalog-no-results">{strings.pos.noMenuResults}</p>
      </Show>
    </section>
  );
}
