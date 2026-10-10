export type MenuItem = { id: string; name: string; price: number; category: string };
export type MenuCategory = { id: string; label: string; items: MenuItem[] };

export const MENU_CATEGORIES: MenuCategory[] = [
  {
    id: "shawarma",
    label: "SHAWARMA",
    items: [
      { id: "shawarma_beef_1", name: "Beef (1 sausage)", price: 3000, category: "SHAWARMA" },
      { id: "shawarma_beef_2", name: "Beef (2 sausages)", price: 3500, category: "SHAWARMA" },
      { id: "shawarma_chicken_1", name: "Chicken (1 sausage)", price: 3800, category: "SHAWARMA" },
      { id: "shawarma_chicken_2", name: "Chicken (2 sausages)", price: 4000, category: "SHAWARMA" },
    ],
  },
  {
    id: "pies",
    label: "PIES",
    items: [
      { id: "pie_meat", name: "Meat Pie", price: 1000, category: "PIES" },
      { id: "pie_chicken", name: "Chicken Pie", price: 1200, category: "PIES" },
    ],
  },
  {
    id: "toast",
    label: "TOAST BREAD",
    items: [
      { id: "toast_pepper", name: "Egg, sardine & pepper", price: 1500, category: "TOAST BREAD" },
      { id: "toast_sardine_sausage", name: "Egg, sardine & sausage", price: 2500, category: "TOAST BREAD" },
      { id: "toast_cheese", name: "Egg, sausage & cheese", price: 3500, category: "TOAST BREAD" },
    ],
  },
  {
    id: "rice",
    label: "RICE",
    items: [
      { id: "rice_asun", name: "Asun Rice", price: 1000, category: "RICE" },
      { id: "rice_jollof_beef_med", name: "Jollof & Fried Rice with Beef (medium plate)", price: 2500, category: "RICE" },
      { id: "rice_jollof_beef_big", name: "Jollof & Fried Rice with Beef (big takeaway)", price: 3300, category: "RICE" },
      { id: "rice_jollof_chicken_med", name: "Jollof & Fried Rice with Chicken (medium plate)", price: 3000, category: "RICE" },
      { id: "rice_jollof_chicken_big", name: "Jollof & Fried Rice with Chicken (big takeaway)", price: 4000, category: "RICE" },
    ],
  },
  {
    id: "parfait",
    label: "PARFAIT",
    items: [
      { id: "parfait_mini", name: "Mini Size", price: 2800, category: "PARFAIT" },
      { id: "parfait_small", name: "Small Size", price: 3000, category: "PARFAIT" },
      { id: "parfait_big", name: "Big Size", price: 3500, category: "PARFAIT" },
    ],
  },
  {
    id: "burger",
    label: "BURGER",
    items: [
      { id: "burger_midi", name: "Midi Burger", price: 4500, category: "BURGER" },
      { id: "burger_jumbo", name: "Jumbo Burger", price: 6000, category: "BURGER" },
    ],
  },
];

export const MENU_FLAT: MenuItem[] = MENU_CATEGORIES.flatMap((c) => c.items);

export function formatNaira(n: number) {
  return "\u20A6" + n.toLocaleString("en-NG");
}
