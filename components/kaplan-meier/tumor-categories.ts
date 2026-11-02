/**
 * Hierarchical Tumor Type Categories
 * Organizes tumor types into solid and hematological categories
 */

export interface TumorCategory {
  id: string;
  name: string;
  types: string[];
}

export interface TumorHierarchy {
  id: string;
  name: string;
  categories: TumorCategory[];
}

// Define the hierarchical structure
export const tumorHierarchy: TumorHierarchy[] = [
  {
    id: "solid",
    name: "Solide Tumoren",
    categories: [
      {
        id: "respiratory",
        name: "Atemwegsorgane",
        types: [
          "C78.9 - Bronchialkarzinom",
          "C15.9 - Ösophaguskarzinom",
          "Bronchialkarzinom",
          "Lungenkarzinom",
          "Ösophaguskarzinom"
        ]
      },
      {
        id: "digestive",
        name: "Verdauungsorgane", 
        types: [
          "C18.9 - Kolonkarzinom",
          "C25.9 - Pankreaskarzinom",
          "C22.0 - Hepatozelluläres Karzinom",
          "Kolonkarzinom",
          "Pankreaskarzinom",
          "Hepatozelluläres Karzinom",
          "Rektumkarzinom",
          "Magenkarzinom"
        ]
      },
      {
        id: "genitourinary",
        name: "Urogenitalorgane",
        types: [
          "C61 - Prostatakarzinom",
          "C56 - Ovarialkarzinom", 
          "C67.9 - Harnblasenkarzinom",
          "Prostatakarzinom",
          "Ovarialkarzinom",
          "Harnblasenkarzinom",
          "Nierenkarzinom",
          "Zervixkarzinom"
        ]
      },
      {
        id: "breast",
        name: "Mammakarzinom",
        types: [
          "C50.9 - Mammakarzinom",
          "Mammakarzinom",
          "Brustkrebs"
        ]
      },
      {
        id: "skin",
        name: "Haut",
        types: [
          "C43.9 - Malignes Melanom",
          "Malignes Melanom",
          "Basalzellkarzinom",
          "Plattenepithelkarzinom"
        ]
      }
    ]
  },
  {
    id: "hematological", 
    name: "Hämatologische Tumoren",
    categories: [
      {
        id: "leukemia",
        name: "Leukämien",
        types: [
          "C91.9 - Akute lymphatische Leukämie",
          "C92.9 - Akute myeloische Leukämie",
          "C91.1 - Chronische lymphatische Leukämie",
          "C92.1 - Chronische myeloische Leukämie",
          "ALL",
          "AML",
          "CLL",
          "CML"
        ]
      },
      {
        id: "lymphoma",
        name: "Lymphome",
        types: [
          "C81.9 - Hodgkin-Lymphom",
          "C85.9 - Non-Hodgkin-Lymphom",
          "Hodgkin-Lymphom",
          "Non-Hodgkin-Lymphom",
          "DLBCL",
          "Mantelzell-Lymphom"
        ]
      },
      {
        id: "myeloma",
        name: "Plasmozytäre Neoplasien",
        types: [
          "C90.0 - Multiples Myelom",
          "Multiples Myelom",
          "Plasmozytom"
        ]
      }
    ]
  }
];

// Helper functions
export function getTumorCategoryForType(tumorType: string): {hierarchy: string, category: string} | null {
  for (const hierarchy of tumorHierarchy) {
    for (const category of hierarchy.categories) {
      if (category.types.some(type => 
        type.toLowerCase().includes(tumorType.toLowerCase()) ||
        tumorType.toLowerCase().includes(type.toLowerCase())
      )) {
        return {
          hierarchy: hierarchy.id,
          category: category.id
        };
      }
    }
  }
  return null;
}

export function getAllTypesInHierarchy(hierarchyId: string): string[] {
  const hierarchy = tumorHierarchy.find(h => h.id === hierarchyId);
  if (!hierarchy) return [];
  
  return hierarchy.categories.flatMap(cat => cat.types);
}

export function getAllTypesInCategory(hierarchyId: string, categoryId: string): string[] {
  const hierarchy = tumorHierarchy.find(h => h.id === hierarchyId);
  if (!hierarchy) return [];
  
  const category = hierarchy.categories.find(c => c.id === categoryId);
  return category?.types || [];
}

export function getHierarchyDisplayName(hierarchyId: string): string {
  return tumorHierarchy.find(h => h.id === hierarchyId)?.name || hierarchyId;
}

export function getCategoryDisplayName(hierarchyId: string, categoryId: string): string {
  const hierarchy = tumorHierarchy.find(h => h.id === hierarchyId);
  return hierarchy?.categories.find(c => c.id === categoryId)?.name || categoryId;
} 