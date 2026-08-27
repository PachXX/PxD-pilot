export type MabCompanySource = Readonly<{
  sourceKey: string;
  sourceTab: 'Clients' | 'Suppliers';
  sourceRow: number;
  name: string;
  roles: readonly ('CUSTOMER' | 'SUPPLIER')[];
  commercialRegistrationNumber: string;
  vatRegistrationNumber: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  contactName: string | null;
  contactPhone: string | null;
}>;

export const MAB_COMPANY_SOURCES: readonly MabCompanySource[] = [
  { sourceKey: 'mab-meta:clients:2', sourceTab: 'Clients', sourceRow: 2, name: 'Al Shuwayer', roles: ['CUSTOMER'], commercialRegistrationNumber: '2051011606', vatRegistrationNumber: '300507679900003', email: 'h.junaid@shuwayer.com', website: null, address: 'Zip 32233, Additional 2336, Building 8967, Al Amir Muhaahd Rd, At Tubayshi, Dammam, Saudi Arabia', contactName: 'Junaid', contactPhone: null },
  { sourceKey: 'mab-meta:clients:3', sourceTab: 'Clients', sourceRow: 3, name: 'M.S Al-Suwaidi Industrial Services', roles: ['CUSTOMER'], commercialRegistrationNumber: '2066001780', vatRegistrationNumber: null, email: 'sameerht@alsuwaidi.com.sa', website: null, address: '8628 Jubail 35729, Secondary 4783, Saudi Arabia', contactName: 'Sameer Hasan Ali Tambe', contactPhone: null },
  { sourceKey: 'mab-meta:clients:4', sourceTab: 'Clients', sourceRow: 4, name: 'Seyana Maintenance Company for Operation & Industrial Services', roles: ['CUSTOMER'], commercialRegistrationNumber: '7013296434', vatRegistrationNumber: '311215410600003', email: 'lawrence@seyanaksa.com, PRC@seyanaksa.com', website: null, address: 'Building 8464, Street 114, Jubail Industrial Area 03, P.O. 35615', contactName: 'Herman Royan', contactPhone: null },
  { sourceKey: 'mab-meta:suppliers:2', sourceTab: 'Suppliers', sourceRow: 2, name: 'DBMS Steel and Metal Solution Trading Company', roles: ['SUPPLIER'], commercialRegistrationNumber: '2050187041', vatRegistrationNumber: null, email: 'khaled.mohammed@dbmscsteel.ae', website: 'https://dbmscsteel.ae/', address: null, contactName: 'Mr. Mohammed Khaled', contactPhone: '966554571328' },
  { sourceKey: 'mab-meta:suppliers:3', sourceTab: 'Suppliers', sourceRow: 3, name: 'Asia Oruba Trading Co.', roles: ['SUPPLIER'], commercialRegistrationNumber: '2051065071', vatRegistrationNumber: null, email: null, website: null, address: null, contactName: null, contactPhone: null },
  { sourceKey: 'mab-meta:suppliers:4', sourceTab: 'Suppliers', sourceRow: 4, name: 'PowerTech International Trading Co.', roles: ['SUPPLIER'], commercialRegistrationNumber: '2051026451', vatRegistrationNumber: '311372689300003', email: 'Info@powertechinternational.com.sa', website: 'http://powertechinternational.com.sa', address: null, contactName: null, contactPhone: null },
  { sourceKey: 'mab-meta:suppliers:5', sourceTab: 'Suppliers', sourceRow: 5, name: 'Sana for Electrical & Telephone Co.', roles: ['SUPPLIER'], commercialRegistrationNumber: '1010143643', vatRegistrationNumber: '30055984700003', email: 'support@sanco.com.sa', website: 'http://sanaco.com.sa', address: null, contactName: 'Abdulwahid', contactPhone: null },
  { sourceKey: 'mab-meta:suppliers:6', sourceTab: 'Suppliers', sourceRow: 6, name: 'Smart Decision Trading Company', roles: ['SUPPLIER'], commercialRegistrationNumber: '2051045171', vatRegistrationNumber: '311360673900003', email: null, website: null, address: null, contactName: null, contactPhone: null },
  { sourceKey: 'mab-meta:suppliers:7', sourceTab: 'Suppliers', sourceRow: 7, name: 'Excellence & Success Business Establishment', roles: ['SUPPLIER'], commercialRegistrationNumber: '2851842816', vatRegistrationNumber: '300544793488883', email: null, website: null, address: null, contactName: null, contactPhone: null },
  { sourceKey: 'mab-meta:suppliers:8', sourceTab: 'Suppliers', sourceRow: 8, name: 'Attieh Trading Company Ltd', roles: ['SUPPLIER'], commercialRegistrationNumber: '2055007244', vatRegistrationNumber: '310030450600003', email: 'info@attiehtrading.com', website: 'https://attiehgroup.com', address: null, contactName: null, contactPhone: null },
] as const;

export type MabDocumentSource = Readonly<{
  sourceRow: number;
  from: string;
  to: string;
  direction: 'Sales' | 'Purchase';
  documentType: 'RFQ' | 'Quotation' | 'PO' | 'Delivery Note' | 'Invoice';
  sourceReference: string | null;
}>;

export const MAB_DOCUMENT_SOURCES: readonly MabDocumentSource[] = [
  ['Al Shuwayer', 'MAB', 'Sales', 'RFQ', 'RFQ from Al Shuwayer to MAB & MAB Vendor.pdf'],
  ['MAB', 'DBMS Steel', 'Purchase', 'Quotation', 'QUOTE DBMSC TO MAB.pdf'],
  ['MAB', 'Al Shuwayer', 'Sales', 'Quotation', 'MAB-TQ-26-1006 TO al shuwayer'],
  ['Al Shuwayer', 'MAB', 'Sales', 'PO', 'ASHM-004151-1 PO from al shuwyer to MAB'],
  ['MAB', 'DBMS Steel', 'Purchase', 'PO', 'MAB-PO-2026-4141- DBMSC..pdf'],
  ['DBMS Steel', 'MAB', 'Purchase', 'Delivery Note', 'DBMS To MAB-DN01.pdf'],
  ['DBMS Steel', 'MAB', 'Purchase', 'Delivery Note', 'DBMSC to MAB Delivery Note.pdf'],
  ['DBMS Steel', 'MAB', 'Purchase', 'Invoice', null],
  ['MAB', 'Al Shuwayer', 'Sales', 'Delivery Note', 'Delivery note - DN164 - Al Shuweir - Copy.pdf'],
  ['MAB', 'Al Shuwayer', 'Sales', 'Delivery Note', 'Delivery note - DN165-A - Al Shuweir.pdf'],
  ['MAB', 'Al Shuwayer', 'Sales', 'Delivery Note', 'Delivery note - DN171 - Al Shuweir.pdf'],
  ['MAB', 'Al Shuwayer', 'Sales', 'Invoice', 'invoice 1 (596) #35.pdf'],
  ['MAB', 'Al Shuwayer', 'Sales', 'Invoice', 'Invoice to Al shuwayer.pdf'],
  ['Al-Suwaidi Industrial Services', 'MAB', 'Sales', 'RFQ', 'email, call, WhatsApp'],
  ['MAB', 'Multiple vendors', 'Purchase', 'Invoice', 'vendor invoices Al-sawaidi.pdf'],
  ['MAB', 'Al-Suwaidi Industrial Services', 'Sales', 'Quotation', 'MAB-QT-26-1004-REV.02-MS AL-SUWAIDI.xlsx'],
  ['Al-Suwaidi Industrial Services', 'MAB', 'Sales', 'PO', 'PO_SIS-PO-26-01027_0.pdf'],
  ['Seyana Jubail', 'MAB', 'Sales', 'RFQ', 'Email, call, WhatsApp'],
  ['MAB', 'Attieh Trading Company', 'Purchase', 'Quotation', null],
  ['MAB', 'Seyana Jubail', 'Sales', 'Quotation', 'MAB-QT-26-1027- SEYANA.xlsx'],
  ['Seyana Jubail', 'MAB', 'Sales', 'PO', 'MAB-INV-254 - Seyana.pdf'],
  ['MAB', 'Attieh Trading Company', 'Purchase', 'Invoice', '350173745 Attieh to MAB INVOICE.pdf'],
  ['MAB', 'Seyana Jubail', 'Sales', 'Delivery Note', 'MAB-INV-254 - Seyana.pdf'],
  ['MAB', 'Seyana Jubail', 'Sales', 'Invoice', 'MAB-INV-254 - Seyana.pdf'],
].map(([from, to, direction, documentType, sourceReference], index) => ({
  sourceRow: index + 2,
  from,
  to,
  direction,
  documentType,
  sourceReference,
})) as readonly MabDocumentSource[];
