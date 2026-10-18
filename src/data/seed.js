/**
 * SEED CONTENT
 * src/data/seed.js
 *
 * Everything the site needs to render with no database at all. It is the
 * bottom layer of the fallback chain (see src/lib/store.js) and the content
 * that "Publish to Firestore" writes on first setup.
 *
 * Source: https://sites.google.com/site/tahsinafarahsanam (Oct 2026).
 * Images are hot-linked from Google Sites; replace them with your own uploads
 * from the editor, because those links can expire.
 */

const gs = (id, w = 1280) => `https://sites.google.com/sitesv-images-rt/${id}=w${w}`;
const doiLink = (doi) => (doi ? `https://doi.org/${doi}` : '');

const PHOTO = gs(
  'AMxu72v1LDQ8j626ZW6S1fNeoG-73SqywomSNTea2dl12BgD-sllbYSaiK8KhsqmIPhlJ9Lu-00WbpYfqOpTAtKkCArUqmGrmdoZJWgthOgv0MMN9P-cINFTmWn4Qn1RLs6L35b2rg16jOkW9eXFmUu910V2D7l8uzoFY49RWQPdJCjgJxIKAOvY2ZU18gHo8GQ',
  900
);

/* ------------------------------------------------------------------ */
/* Site configuration                                                  */
/* ------------------------------------------------------------------ */

const config = {
  site: {
    title: 'Dr. Tahsina Farah Sanam',
    description:
      'Professor at the Institute of Appropriate Technology, BUET. Research in AI, machine learning, Wi-Fi sensing and IoT for smart healthcare, assistive living and smart cities.',
    language: 'en',
  },
  brand: { name: 'Tahsina Farah Sanam', mark: 'TFS', showMark: true },
  person: {
    name: 'Tahsina Farah Sanam',
    honorific: 'Dr.',
    position: 'Professor',
    affiliation: 'Institute of Appropriate Technology, BUET',
    photo: PHOTO,
    // Highlighted in bold inside author lists
    citeAs: 'T. F. Sanam',
  },
  contact: {
    email: 'tahsina@iat.buet.ac.bd',
    phone: '',
    address: 'Institute of Appropriate Technology (IAT)\nBangladesh University of Engineering and Technology\nDhaka-1000, Bangladesh',
    office: '',
    hours: '',
    mapUrl: 'https://www.google.com/maps?q=Institute+of+Appropriate+Technology,+BUET,+Dhaka&output=embed',
  },
  socials: [
    { label: 'Google Scholar', url: 'https://scholar.google.com/citations?user=GHwoCWQAAAAJ&hl=en', icon: 'GraduationCap' },
    { label: 'LinkedIn', url: 'http://www.linkedin.com/in/tfsanam', icon: 'Linkedin' },
    { label: 'CPI Lab', url: 'https://sites.google.com/view/tahsina-cpi-lab/home', icon: 'FlaskConical' },
    { label: 'Email', url: 'mailto:tahsina@iat.buet.ac.bd', icon: 'Mail' },
  ],
  theme: {
    preset: 'signal',
    custom: null,
    fonts: { heading: 'Newsreader', body: 'Instrument Sans' },
    radius: 14,
    baseSize: 17,
    container: 1180,
  },
  nav: {
    maxVisible: 7,
    sticky: true,
    align: 'right',
    theme: 'page', // page | soft | card | contrast | accent | custom
    bgColor: '',
    textColor: '',
    opacity: 90, // %
    blur: 12, // px
    topTransparent: false,
    tabStyle: 'pills', // pills | underline | minimal | boxed
    showIcons: true,
    textSize: 'md', // sm | md | lg
    height: 64,
    divider: 'scroll', // scroll | always | never
    markShape: 'circle', // circle | rounded | square
  },
  footer: {
    line: 'Institute of Appropriate Technology, BUET, Dhaka',
    showSocials: true,
    note: '',
  },
  drawer: { side: 'left', width: 75, itemClick: 'drawer' },
  effects: { cursor: true, cursorStyle: 'comet', scroll: 'genie' },
};

/* ------------------------------------------------------------------ */
/* Content types                                                       */
/* ------------------------------------------------------------------ */
/*
 * Field roles tell layouts what a field means, so one layout can show any
 * collection: title, subtitle, meta, date, group, badge, body, image, link, tags.
 */

const schema = {
  collections: {
    publications: {
      label: 'Publications',
      singular: 'Publication',
      icon: 'BookOpen',
      citation: true,
      defaultSort: { field: 'year', dir: 'desc' },
      fields: [
        { key: 'title', label: 'Title', type: 'text', role: 'title' },
        { key: 'authors', label: 'Authors', type: 'text', role: 'meta' },
        { key: 'venue', label: 'Journal / conference', type: 'text', role: 'subtitle' },
        { key: 'details', label: 'Volume, pages, place', type: 'text', role: 'meta' },
        { key: 'year', label: 'Year', type: 'number', role: 'date' },
        {
          key: 'type',
          label: 'Type',
          type: 'select',
          role: 'group',
          options: ['Journal', 'Conference', 'Patent', 'Preprint', 'Poster / demo', 'Book chapter'],
        },
        { key: 'note', label: 'Badge (e.g. Q1)', type: 'text', role: 'badge' },
        { key: 'doi', label: 'DOI', type: 'text', role: 'detail' },
        { key: 'link', label: 'Link', type: 'url', role: 'link' },
        { key: 'pdf', label: 'PDF', type: 'url', role: 'link' },
        { key: 'abstract', label: 'Abstract', type: 'markdown', role: 'body' },
        { key: 'tags', label: 'Keywords', type: 'tags', role: 'tags' },
        { key: 'image', label: 'Figure', type: 'image', role: 'image' },
      ],
    },
    research: {
      label: 'Research areas',
      singular: 'Research area',
      icon: 'Radar',
      defaultSort: { field: 'order', dir: 'asc' },
      fields: [
        { key: 'title', label: 'Title', type: 'text', role: 'title' },
        { key: 'summary', label: 'Summary', type: 'textarea', role: 'subtitle' },
        { key: 'body', label: 'Details', type: 'markdown', role: 'body' },
        { key: 'image', label: 'Image', type: 'image', role: 'image' },
        { key: 'tags', label: 'Topics', type: 'tags', role: 'tags' },
        { key: 'link', label: 'Link', type: 'url', role: 'link' },
      ],
    },
    experience: {
      label: 'Experience',
      singular: 'Position',
      icon: 'Briefcase',
      defaultSort: { field: 'order', dir: 'asc' },
      fields: [
        { key: 'role', label: 'Position', type: 'text', role: 'title' },
        { key: 'org', label: 'Organisation', type: 'text', role: 'subtitle' },
        { key: 'unit', label: 'Department / unit', type: 'text', role: 'meta' },
        { key: 'period', label: 'Period', type: 'text', role: 'date' },
        { key: 'location', label: 'Location', type: 'text', role: 'meta' },
        { key: 'description', label: 'Description', type: 'markdown', role: 'body' },
        { key: 'logo', label: 'Logo', type: 'image', role: 'image' },
      ],
    },
    education: {
      label: 'Education',
      singular: 'Degree',
      icon: 'GraduationCap',
      defaultSort: { field: 'order', dir: 'asc' },
      fields: [
        { key: 'degree', label: 'Degree', type: 'text', role: 'title' },
        { key: 'institution', label: 'Institution', type: 'text', role: 'subtitle' },
        { key: 'department', label: 'Department', type: 'text', role: 'meta' },
        { key: 'year', label: 'Year', type: 'text', role: 'date' },
        { key: 'note', label: 'Note', type: 'markdown', role: 'body' },
        { key: 'logo', label: 'Logo', type: 'image', role: 'image' },
      ],
    },
    awards: {
      label: 'Awards & honours',
      singular: 'Award',
      icon: 'Award',
      defaultSort: { field: 'year', dir: 'desc' },
      fields: [
        { key: 'title', label: 'Title', type: 'text', role: 'title' },
        { key: 'org', label: 'Awarded by', type: 'text', role: 'subtitle' },
        { key: 'year', label: 'Year', type: 'number', role: 'date' },
        {
          key: 'category',
          label: 'Category',
          type: 'select',
          role: 'group',
          options: ['Award', 'Fellowship', 'Invited talk', 'Recognition', 'Scholarship & travel'],
        },
        { key: 'description', label: 'Description', type: 'markdown', role: 'body' },
        { key: 'image', label: 'Photo', type: 'image', role: 'image' },
        { key: 'link', label: 'Link', type: 'url', role: 'link' },
      ],
    },
    grants: {
      label: 'Grants',
      singular: 'Grant',
      icon: 'Landmark',
      defaultSort: { field: 'year', dir: 'desc' },
      fields: [
        { key: 'title', label: 'Project / topic', type: 'text', role: 'title' },
        { key: 'funder', label: 'Funder', type: 'text', role: 'subtitle' },
        { key: 'year', label: 'Year', type: 'text', role: 'date' },
        { key: 'role', label: 'Role', type: 'text', role: 'badge' },
        { key: 'description', label: 'Description', type: 'markdown', role: 'body' },
      ],
    },
    service: {
      label: 'Service & leadership',
      singular: 'Role',
      icon: 'Users',
      defaultSort: { field: 'order', dir: 'asc' },
      fields: [
        { key: 'role', label: 'Role', type: 'text', role: 'title' },
        { key: 'org', label: 'Organisation / event', type: 'text', role: 'subtitle' },
        { key: 'period', label: 'Period', type: 'text', role: 'date' },
        {
          key: 'type',
          label: 'Type',
          type: 'select',
          role: 'group',
          options: ['Editorial', 'Conference', 'Professional society', 'Leadership', 'Membership'],
        },
        { key: 'link', label: 'Link', type: 'url', role: 'link' },
      ],
    },
    news: {
      label: 'News',
      singular: 'News item',
      icon: 'Newspaper',
      defaultSort: { field: 'order', dir: 'asc' },
      fields: [
        { key: 'title', label: 'Headline', type: 'text', role: 'title' },
        { key: 'date', label: 'Date', type: 'text', role: 'date' },
        { key: 'body', label: 'Details', type: 'markdown', role: 'body' },
        { key: 'image', label: 'Image', type: 'image', role: 'image' },
        { key: 'link', label: 'Link', type: 'url', role: 'link' },
      ],
    },
    team: {
      label: 'Research group',
      singular: 'Member',
      icon: 'UsersRound',
      defaultSort: { field: 'order', dir: 'asc' },
      fields: [
        { key: 'name', label: 'Name', type: 'text', role: 'title' },
        { key: 'position', label: 'Position', type: 'text', role: 'subtitle' },
        { key: 'program', label: 'Programme', type: 'text', role: 'meta' },
        { key: 'status', label: 'Status', type: 'select', role: 'group', options: ['Current', 'Alumni'] },
        { key: 'bio', label: 'Bio', type: 'markdown', role: 'body' },
        { key: 'photo', label: 'Photo', type: 'image', role: 'image' },
        { key: 'interests', label: 'Interests', type: 'tags', role: 'tags' },
        { key: 'link', label: 'Profile link', type: 'url', role: 'link' },
      ],
    },
    collaborators: {
      label: 'Collaborators',
      singular: 'Collaborator',
      icon: 'Handshake',
      defaultSort: { field: 'order', dir: 'asc' },
      fields: [
        { key: 'name', label: 'Name', type: 'text', role: 'title' },
        { key: 'position', label: 'Position', type: 'text', role: 'subtitle' },
        { key: 'affiliation', label: 'Affiliation', type: 'text', role: 'meta' },
        { key: 'photo', label: 'Photo', type: 'image', role: 'image' },
        { key: 'bio', label: 'Short bio', type: 'markdown', role: 'body' },
        { key: 'interests', label: 'Research interests', type: 'tags', role: 'tags' },
        { key: 'email', label: 'Email', type: 'text', role: 'detail' },
        { key: 'link', label: 'Link', type: 'url', role: 'link' },
      ],
    },
    gallery: {
      label: 'Gallery',
      singular: 'Photo',
      icon: 'Images',
      defaultSort: { field: 'order', dir: 'asc' },
      fields: [
        { key: 'image', label: 'Image', type: 'image', role: 'image' },
        { key: 'caption', label: 'Caption', type: 'text', role: 'title' },
        { key: 'year', label: 'Year', type: 'text', role: 'date' },
        { key: 'description', label: 'Description', type: 'markdown', role: 'body' },
        { key: 'link', label: 'Link', type: 'url', role: 'link' },
      ],
    },
  },
};

/* ------------------------------------------------------------------ */
/* Items                                                               */
/* ------------------------------------------------------------------ */

const items = [];
const add = (collection, prefix, list) =>
  list.forEach((data, i) =>
    items.push({ id: `${prefix}-${String(i + 1).padStart(2, '0')}`, collection, order: (i + 1) * 10, hidden: false, ...data })
  );

const pub = (type, authors, title, venue, year, extra = {}) => ({
  type,
  authors,
  title,
  venue,
  year,
  doi: extra.doi || '',
  link: extra.link || doiLink(extra.doi),
  details: extra.details || '',
  note: extra.note || '',
  tags: extra.tags || [],
  abstract: extra.abstract || '',
  pdf: extra.pdf || '',
});

add('publications', 'pub', [
  pub('Patent', 'P. Monogioudis, T. F. Sanam, D. Wang', 'Autonomous localization in wireless networks', 'US Patent US10582332B2', 2020, {
    details: 'US Patent App. 15/837,621, granted March 2020',
    link: 'https://patentimages.storage.googleapis.com/f7/9a/a9/ac418aa805df71/US10582332.pdf',
    tags: ['Localization', 'Wireless networks'],
  }),
  pub('Journal', 'A. Islam, S. Akter, T. F. Sanam', 'Secure Tracking of Patient’s Vital Signs Using CSI-Based Homomorphic Encryption-Enabled Deep Learning Framework', 'IEEE Journal of Biomedical and Health Informatics', 2025, { note: 'Q1', tags: ['Wi-Fi CSI', 'Healthcare', 'Privacy'] }),
  pub('Journal', 'M. Kabir, M. W. Nafee, M. Mohtasim, T. F. Sanam', 'A Robust Signal Processing Framework for CSI-Based Bangla Sign Language Recognition via Doppler-Based Subcarrier Selection, Complex ICA, and Energy-Based Fusion', 'IEEE Access', 2025, { note: 'Q1', tags: ['Wi-Fi CSI', 'Sign language', 'Assistive technology'] }),
  pub('Journal', 'M. Kabir, M. W. Nafee, M. Mohtasim, T. F. Sanam', 'Descriptor: A Word-Level Wi-Fi CSI Based Deep Bangladeshi Sign Language Dataset (WiBaSL)', 'IEEE Data Descriptions', 2025, { tags: ['Dataset', 'Wi-Fi CSI', 'Sign language'] }),
  pub('Journal', 'I. Jahan, T. F. Sanam', 'A Comprehensive Framework for Customer Retention in E-commerce Using Machine Learning Based on Churn Prediction, Customer Segmentation, and Recommendation', 'Electronic Commerce Research', 2024, { tags: ['Machine learning', 'E-commerce'] }),
  pub('Journal', 'N. Pervin, T. F. Sanam, H. Imtiaz', 'Privacy-Preserving Human Activity Recognition Using Principal Component-Based Wavelet CNN', 'Signal, Image and Video Processing (Springer)', 2024, { tags: ['Activity recognition', 'Privacy'] }),
  pub('Journal', 'I. A. Showmik, T. F. Sanam, H. Imtiaz', 'Human Activity Recognition from Wi-Fi CSI Data Using Principal Component-Based Wavelet CNN', 'Digital Signal Processing (Elsevier)', 2023, { details: 'Vol. 138, 104056', tags: ['Wi-Fi CSI', 'Activity recognition'] }),
  pub('Journal', 'S. A. Suha, T. F. Sanam', 'Sustainability Assessment of Artificial Intelligence in Healthcare Decision Making', 'International Journal of Information Management Data Insights (Elsevier)', 2023, { tags: ['Healthcare', 'AI policy'] }),
  pub('Journal', 'S. A. Suha, T. F. Sanam', 'A Deep Convolutional Neural Network-Based Approach for Detecting Burn Severity from Skin Burn Images', 'Machine Learning with Applications (Elsevier)', 2022, { tags: ['Deep learning', 'Healthcare', 'Medical imaging'] }),
  pub('Journal', 'S. A. Suha, M. Akhtaruzzaman, T. F. Sanam', 'A Fuzzy Model to Predict Intravenous Fluid Resuscitation Rate for Burn Patients', 'Healthcare Analytics (Elsevier)', 2022, { doi: '10.1016/j.health.2022.100070', details: '100070', tags: ['Fuzzy systems', 'Healthcare'] }),
  pub('Journal', 'T. F. Sanam, H. Godrich', 'A Multi-View Discriminant Learning Approach for Indoor Localization Using Amplitude and Phase Features of CSI', 'IEEE Access', 2020, { doi: '10.1109/ACCESS.2020.2982277', tags: ['Wi-Fi CSI', 'Localization'] }),
  pub('Preprint', 'T. F. Sanam, H. Godrich', 'CoMuTe: A Convolutional Neural Network Based Device Free Multiple Target Localization Using CSI', 'arXiv', 2020, { tags: ['Wi-Fi CSI', 'Localization', 'Deep learning'] }),
  pub('Journal', 'T. F. Sanam, C. Shahnaz', 'A Semisoft Thresholding Method Based on Teager Energy Operation on Wavelet Packet Coefficients for Enhancing Noisy Speech', 'EURASIP Journal on Audio, Speech, and Music Processing (Springer Open)', 2013, { doi: '10.1186/1687-4722-2013-25', tags: ['Speech enhancement'] }),
  pub('Journal', 'T. F. Sanam, C. Shahnaz', 'Noisy Speech Enhancement Based on an Adaptive Threshold and a Modified Hard Thresholding Function in Wavelet Packet Domain', 'Digital Signal Processing (Elsevier)', 2013, { doi: '10.1016/j.dsp.2012.12.001', details: 'Vol. 23, no. 3, pp. 941–951', tags: ['Speech enhancement'] }),
  pub('Journal', 'T. F. Sanam, C. Shahnaz', 'Enhancement of Noisy Speech Based on a Custom Thresholding Function with a Statistically Determined Threshold', 'International Journal of Speech Technology (Springer)', 2012, { doi: '10.1007/s10772-012-9144-6', tags: ['Speech enhancement'] }),
  pub('Journal', 'T. F. Sanam, C. Shahnaz', 'Teager Energy Operation on Wavelet Packet Coefficients for Enhancing Noisy Speech Using a Hard Thresholding Function', 'Signal Processing: An International Journal', 2012, { details: 'Vol. 6, no. 2, pp. 22–43', tags: ['Speech enhancement'] }),
  pub('Journal', 'T. F. Sanam, C. Shahnaz', 'An Approach for Noisy Speech Enhancement Through Soft Thresholding Function by Employing the Teager Energy Operation on Wavelet Packet', 'International Journal of Scientific & Technology Research', 2012, { details: 'Vol. 1, no. 2', tags: ['Speech enhancement'] }),
  pub('Conference', 'S. Akter, T. F. Sanam', 'A Blockchain Framework for Secure Healthcare Data Management Using Role-Based Access Control and Smart Contracts', 'International Conference on Electrical, Computer and Communication Engineering (ECCE)', 2025, { doi: '10.1109/ECCE64574.2025.11013162', details: 'Chittagong, Bangladesh', tags: ['Blockchain', 'Healthcare'] }),
  pub('Conference', 'S. Ahmed, T. F. Sanam', 'An End-to-End E-waste Collection and Sorting System for Optimized Flow Regulation: From End-of-Life to Processing', '27th International Conference on Computer and Information Technology (ICCIT)', 2024, { doi: '10.1109/ICCIT64611.2024.11022354', details: 'Cox’s Bazar, Bangladesh, pp. 2369–2374', tags: ['E-waste', 'Smart city'] }),
  pub('Conference', 'D. K. Suvra, T. F. Sanam', 'A Cloud-Based Hybrid Model for Real-Time Detection of BRTA-Approved Licence Plates Using YOLO Tiny and Haar Cascade', '27th International Conference on Computer and Information Technology (ICCIT)', 2024, { doi: '10.1109/ICCIT64611.2024.11022598', details: 'Cox’s Bazar, Bangladesh, pp. 2488–2493', tags: ['Computer vision', 'Smart transport'] }),
  pub('Conference', 'F. Sadik, I. A. Showmik, B. I. Morshed, T. F. Sanam', 'A Novel Geometric Visualization of Dual-Lead ECG Signals for Beat-by-Beat Arrhythmia Detection with a 2D CNN Deep Learning Classifier', '26th International Conference on Computer and Information Technology (ICCIT)', 2023, { doi: '10.1109/ICCIT60459.2023.10441002', tags: ['ECG', 'Deep learning', 'Healthcare'] }),
  pub('Conference', 'I. A. Showmik, F. Sadik, B. I. Morshed, T. F. Sanam', 'Beat-wise Classification of Arrhythmia Using Novel Combination of ECG Signal-Specific and Signal-Independent Features with ML Algorithm', '26th International Conference on Computer and Information Technology (ICCIT)', 2023, { doi: '10.1109/ICCIT60459.2023.10441167', tags: ['ECG', 'Machine learning'] }),
  pub('Conference', 'M. I. Masroor, K. S. Sakib, M. Hasan, M. A. Al Arman, P. Dey, T. F. Sanam', 'Ensemble Based Machine Learning Approach for Predicting Customer Churn in E-Commerce', '26th International Conference on Computer and Information Technology (ICCIT)', 2023, { doi: '10.1109/ICCIT60459.2023.10441468', tags: ['Machine learning', 'E-commerce'] }),
  pub('Conference', 'I. A. Showmik, T. F. Sanam, H. Imtiaz', 'DCT-Based Feature Extraction for Human Activity Recognition Using WiFi Channel State Information Data', 'IEEE Region 10 Conference (TENCON)', 2023, { doi: '10.1109/TENCON58879.2023.10322339', details: 'Thailand, pp. 1129–1133', tags: ['Wi-Fi CSI', 'Activity recognition'] }),
  pub('Conference', 'M. A. Rahman, A. M. Fuad, T. F. Sanam', 'A Convolutional Neural Network Based Device-Free Indoor Localization Using CSI', 'IEEE Region 10 Humanitarian Technology Conference (R10-HTC)', 2023, { doi: '10.1109/R10-HTC57504.2023.10461886', details: 'India', tags: ['Wi-Fi CSI', 'Localization'] }),
  pub('Conference', 'T. S. Sheila, N. J. Nishat, A. H. Tanjila, J. Nuri, T. F. Sanam, S. A. Suha', 'Predicting Hospital Readmission for Diabetic Patients Within 30 Days Using Machine Learning: A Breakthrough in Personalized Healthcare', 'IEEE Region 10 Humanitarian Technology Conference (R10-HTC)', 2023, { doi: '10.1109/R10-HTC57504.2023.10461808', details: 'India', tags: ['Healthcare', 'Machine learning'] }),
  pub('Conference', 'I. Jahan, T. F. Sanam', 'An Improved Machine Learning Based Customer Churn Prediction for Insight and Recommendation in E-commerce', '25th International Conference on Computer and Information Technology (ICCIT)', 2022, { doi: '10.1109/ICCIT57492.2022.10054771', details: 'Cox’s Bazar, Bangladesh', tags: ['Machine learning', 'E-commerce'] }),
  pub('Conference', 'S. A. Suha, T. F. Sanam', 'Predicting Burn Injury Intensity from Skin Burn Images with Hybrid Machine Learning Techniques', '12th International Conference on Electrical and Computer Engineering (ICECE)', 2022, { doi: '10.1109/ICECE57408.2022.10088521', details: 'BUET, Dhaka', tags: ['Medical imaging', 'Healthcare'] }),
  pub('Conference', 'S. A. Suha, T. F. Sanam', 'A Machine Learning Approach for Predicting Patient’s Length of Hospital Stay with Random Forest Regression', 'IEEE Region 10 Symposium (TENSYMP)', 2022, { doi: '10.1109/TENSYMP54529.2022.9864447', details: 'Mumbai, India', tags: ['Healthcare', 'Machine learning'] }),
  pub('Conference', 'S. A. Suha, T. F. Sanam', 'Challenges and Prospects of Adopting Industry 4.0 and Assessing the Role of Intelligent Robotics', 'IEEE World Conference on Applied Intelligence and Computing (AIC)', 2022, { doi: '10.1109/AIC55036.2022.9848946', details: 'Sonbhadra, India', tags: ['Industry 4.0', 'Robotics'] }),
  pub('Conference', 'S. A. Suha, T. F. Sanam, M. I. Jahan', 'National Policies and Their Significance in Bangladesh for the Adoption of Industry 4.0', 'IEEE World Conference on Applied Intelligence and Computing (AIC)', 2022, { doi: '10.1109/AIC55036.2022.9848848', details: 'Sonbhadra, India', tags: ['Industry 4.0', 'Policy'] }),
  pub('Conference', 'T. F. Sanam, H. Godrich', 'FuseLoc: A CCA Based Information Fusion for Indoor Localization Using CSI Phase and Amplitude of WiFi Signals', 'IEEE International Conference on Acoustics, Speech and Signal Processing (ICASSP)', 2019, { doi: '10.1109/ICASSP.2019.8683316', details: 'Brighton, UK, pp. 7565–7569', tags: ['Wi-Fi CSI', 'Localization'] }),
  pub('Conference', 'T. F. Sanam, H. Godrich', 'Device Free Indoor Localization Using Discriminant Features of CSI: A Canonical Correlation Paradigm', '52nd Asilomar Conference on Signals, Systems, and Computers', 2018, { doi: '10.1109/ACSSC.2018.8645524', details: 'Pacific Grove, CA, USA, pp. 423–427', tags: ['Wi-Fi CSI', 'Localization'] }),
  pub('Conference', 'T. F. Sanam, H. Godrich', 'An Improved CSI Based Device Free Indoor Localization Using Machine Learning Based Classification Approach', '26th European Signal Processing Conference (EUSIPCO)', 2018, { doi: '10.23919/EUSIPCO.2018.8553394', details: 'Rome, Italy, pp. 2390–2394', tags: ['Wi-Fi CSI', 'Localization'] }),
  pub('Poster / demo', 'T. F. Sanam, H. Godrich', 'Device Free Indoor Localization Using Channel State Information', 'ACM Richard Tapia Celebration of Diversity in Computing Conference (Tapia)', 2018, { tags: ['Wi-Fi CSI', 'Localization'] }),
  pub('Conference', 'T. F. Sanam, M. M. Hoque', 'Technology Assessment of Fourth Generation Technology for Wireless Communication in Bangladesh with Analytical Hierarchical Process', 'International Conference on Informatics, Electronics & Vision (ICIEV)', 2014, { doi: '10.1109/ICIEV.2014.6850808', tags: ['Wireless communication', 'Technology assessment'] }),
  pub('Conference', 'H. Imtiaz, T. F. Sanam', 'Frequency Domain Feature Extraction for Power Quality Disturbance Classification', 'International Conference on Informatics, Electronics & Vision (ICIEV)', 2013, { doi: '10.1109/ICIEV.2013.6572701', tags: ['Signal processing', 'Power quality'] }),
  pub('Conference', 'T. F. Sanam, H. Imtiaz', 'A DCT-Based Noisy Speech Enhancement Method Using Teager Energy Operator', '5th International Conference on Knowledge and Smart Technology (KST)', 2013, { doi: '10.1109/KST.2013.6512780', tags: ['Speech enhancement'] }),
  pub('Conference', 'T. F. Sanam, C. Shahnaz', 'A Combination of Semisoft and μ-law Thresholding Functions for Enhancing Noisy Speech in Wavelet Packet Domain', '7th International Conference on Electrical & Computer Engineering (ICECE)', 2012, { doi: '10.1109/ICECE.2012.6471692', details: 'pp. 884–887', tags: ['Speech enhancement'] }),
  pub('Conference', 'T. F. Sanam, H. Imtiaz', 'A Novel Approach of Automated Heart Rate Calculation in ECG Signal Through Wave Boundaries Detection', 'IEEE International Conference on Informatics, Electronics & Vision (ICIEV)', 2012, { doi: '10.1109/ICIEV.2012.6317532', details: 'pp. 677–682', tags: ['ECG', 'Signal processing'] }),
  pub('Conference', 'T. F. Sanam, C. Shahnaz', 'An Approach for Noisy Speech Enhancement by Employing the Teager Energy Operation on Wavelet Packet', 'IEEE Region 10 Conference (TENCON)', 2011, { details: 'pp. 1135–1138', tags: ['Speech enhancement'] }),
]);

add('research', 'res', [
  {
    title: 'Wi-Fi sensing and device-free localization',
    summary: 'Using the channel state information (CSI) of ordinary Wi-Fi signals to locate and track people without any device on their body.',
    body:
      'Her doctoral work at Rutgers showed that the amplitude and phase of Wi-Fi CSI carry enough information to localise people indoors. The line of work includes multi-view discriminant learning, CCA-based fusion (FuseLoc, ICASSP 2019), CNN-based multiple-target localisation (CoMuTe) and a US patent on autonomous localization in wireless networks, co-invented with Nokia Bell Labs researchers.',
    tags: ['Channel state information', 'Indoor localization', 'Signal processing'],
  },
  {
    title: 'AI for smart healthcare',
    summary: 'Contactless monitoring and decision support for hospitals and homes, built for settings with few specialists.',
    body:
      'Projects range from tracking vital signs through Wi-Fi CSI with homomorphic encryption, to ECG arrhythmia detection, burn-severity assessment from images, fluid-resuscitation modelling, and predicting readmission and length of stay. As a UNESCO-OWSD Early Career Fellow she is developing contactless, AI-based screening support for autism spectrum disorder in Bangladesh.',
    tags: ['Autism screening', 'Vital signs', 'ECG', 'Medical imaging'],
  },
  {
    title: 'Assistive technology and activity recognition',
    summary: 'Recognising gestures, sign language and daily activities from wireless signals, with privacy built in.',
    body:
      'Her group released WiBaSL, a word-level Wi-Fi CSI dataset for Bangladeshi Sign Language, together with a signal-processing pipeline for recognising it. Related work recognises human activity with wavelet CNNs, including privacy-preserving variants.',
    tags: ['Sign language', 'Activity recognition', 'Assistive living'],
  },
  {
    title: 'Smart cities and sustainability',
    summary: 'IoT and machine learning for waste management, transport and smart buildings in Bangladesh.',
    body:
      'Funded projects cover electronic and plastic waste management, smart home and office systems, and smart patient monitoring. Recent papers include an end-to-end e-waste collection and sorting system and real-time detection of BRTA-approved licence plates.',
    tags: ['E-waste', 'Smart transport', 'IoT'],
  },
  {
    title: 'Trustworthy health data',
    summary: 'Keeping medical data private and auditable as it moves between devices, clinics and models.',
    body:
      'Work includes blockchain frameworks with role-based access control for healthcare records, encrypted deep learning for vital-sign tracking, and assessing the sustainability of AI in clinical decision making.',
    tags: ['Blockchain', 'Homomorphic encryption', 'Privacy'],
  },
  {
    title: 'Speech and signal processing',
    summary: 'Earlier work on enhancing noisy speech with wavelet packets and the Teager energy operator.',
    body:
      'Her M.Sc. research at BUET produced a series of journal and conference papers on thresholding methods for speech enhancement in the wavelet packet domain, published in Digital Signal Processing, EURASIP JASM and the International Journal of Speech Technology.',
    tags: ['Speech enhancement', 'Wavelets'],
  },
]);

add('experience', 'exp', [
  { role: 'Professor', org: 'Bangladesh University of Engineering and Technology (BUET)', unit: 'Institute of Appropriate Technology', period: 'Jul 2024 – Present', location: 'Dhaka, Bangladesh' },
  { role: 'Associate Professor', org: 'Bangladesh University of Engineering and Technology (BUET)', unit: 'Institute of Appropriate Technology', period: 'Jun 2022 – Jun 2024', location: 'Dhaka, Bangladesh' },
  { role: 'Assistant Professor', org: 'Bangladesh University of Engineering and Technology (BUET)', unit: 'Institute of Appropriate Technology', period: 'Aug 2020 – May 2022', location: 'Dhaka, Bangladesh' },
  { role: 'Summer Intern', org: 'Nokia Bell Labs', unit: 'Murray Hill, New Jersey', period: '2018', location: 'New Jersey, USA', description: 'Research internship on localization in wireless networks.' },
  { role: 'Teaching Assistant', org: 'Rutgers, The State University of New Jersey', unit: 'Department of Electrical and Computer Engineering', period: '2015 – 2020', location: 'New Jersey, USA' },
  { role: 'Assistant Professor', org: 'Bangladesh University of Engineering and Technology (BUET)', unit: 'Institute of Appropriate Technology', period: 'Feb 2013 – Aug 2014', location: 'Dhaka, Bangladesh' },
  { role: 'Lecturer', org: 'Bangladesh University of Engineering and Technology (BUET)', unit: 'Institute of Appropriate Technology', period: 'Oct 2011 – Feb 2013', location: 'Dhaka, Bangladesh' },
  { role: 'Lecturer', org: 'Daffodil International University', unit: 'Department of Electrical and Electronic Engineering', period: 'Sep 2009 – Oct 2011', location: 'Dhaka, Bangladesh' },
]);

add('education', 'edu', [
  { degree: 'Ph.D. in Electrical and Computer Engineering', institution: 'Rutgers, The State University of New Jersey', department: 'Department of ECE', year: '2020', note: 'Thesis on device-free indoor localization using Wi-Fi channel state information, with Prof. Hana Godrich. Defended 12 March 2020; received the ECE Graduate Program Academic Achievement Award (Best Thesis).' },
  { degree: 'M.Sc. in Electrical and Electronic Engineering', institution: 'Bangladesh University of Engineering and Technology (BUET)', department: 'Department of EEE', year: '2012' },
  { degree: 'B.Sc. in Electrical and Electronic Engineering', institution: 'Bangladesh University of Engineering and Technology (BUET)', department: 'Department of EEE', year: '2009' },
  { degree: 'Higher Secondary Certificate (HSC)', institution: 'Viqarunnisa Noon College, Dhaka', department: '', year: '2003', note: 'One of only 20 students in the country to earn GPA 5.00 out of 5.00 in 2003, the first GPA batch.' },
]);

add('awards', 'awd', [
  { title: 'Guest speaker, UNESCO-TWAS roundtable “Science and Tech: Shifts and Global Impact”', org: 'Trieste Next science festival, Italy', year: 2025, category: 'Invited talk', link: 'https://twas.org/article/artificial-intelligence-global-south', image: gs('AMxu72ugyueBg3MHarocnvHDY9MAV2-FIcpA1olC9l4C-cXolh0Nk4XI6EPLGqbgeM5iDJxlPjKHPFuluCn82Y0gjO7bsuqpFj4uGRXe-Ojibp6QJ6icwyQ-1ZOZzJRvMOuUk0i_NMsOiE4_yw9LDA625AvevVIOlkWfjqikQFLzAjDJc0CyH8yDlTHnsuFk1wA_H78vrU2WBJDbBOP6oy3O8hzjCdeccn6D5wS1I8hsT4s') },
  { title: 'স্বপ্নজয়ী নারী সম্মাননা ২০২৫ (Swapnajoyee Nari Award 2025)', org: 'Outstanding contribution to AI and smart healthcare innovation', year: 2025, category: 'Award', description: 'One of 20 women from Bangladesh and abroad selected by the jury after several rounds of screening. Presented by Faiz Taiyeb Ahmad, Special Assistant to the Chief Adviser of the Interim Government of Bangladesh.', image: gs('AMxu72s-85yU_kfZhFYHJdL3JZBvWinsamNIUfWwh4pL9yadEIV9eV6LSaza5FXOiRvSPczCZr3TNbBSrlFqPGib7NcZJ9ylJaDGEn_Fl41an_xEn9xbDcYd0ZLDabW2zlrAy4a09S8cCvqWohnZea2wCEohVS94yW9Mg8bn_-YtFzbHeEWtmkPC9EUxKz_IZ7j2XRyayt-RZ2IDhxTUEksClnohIdDUjmUvlVgUpZcW') },
  { title: 'Early Career Fellowship', org: 'UNESCO-OWSD (Organization for Women in Science for the Developing World)', year: 2023, category: 'Fellowship', description: 'One of 28 women scientists worldwide selected for the 2023 fellowship, received in Trieste, Italy. The fellowship supports research that applies AI and wireless communication to a national challenge.', image: gs('AMxu72vMnKA2T0N5GMzPqo_SYf6syDkHqNYSKuGyDMfTOwVvSvXUc37O8Expu91QEuXr0R-DvO4_D5_JYqCgPtpNoo3xstv1uK3tftAjm2SUrLnRrm5C4RzSdPXNDTkWWHVY9E4fArThh4ro94av2E3IkhM5yqlk0yQhRAzoUFOm4BLEz1OvP2zBXj5zVFISG8JTQFy-ipaELFgxr6wDaLX5znPVreZqIuo-m6vDXA4S'), link: 'https://www.thedailystar.net/tech-startup/news/2-bangladeshis-receive-prestigious-owsd-fellowships-enhance-global-research-3516176' },
  { title: 'Global Artificial Intelligence and Machine Learning Award', org: 'IEOM Society, 6th IEOM Bangladesh International Conference', year: 2023, category: 'Award' },
  { title: 'Forum 86 Research Excellence Award (Early Researcher)', org: 'Forum 86', year: 2022, category: 'Award', description: 'Awarded for outstanding academic achievement in wireless communications.', link: 'https://forum86.org/activities/' },
  { title: 'Supervisor, second runner-up team, IEEE Signal Processing Cup', org: 'IEEE ICASSP 2022', year: 2022, category: 'Recognition', description: 'Supervised the BUET team placed third worldwide (USD 1,500 prize). Recognised by BUET’s Directorate of Students’ Welfare.' },
  { title: 'GHC Faculty Scholarship', org: 'AnitaB.org and Google, Grace Hopper Celebration', year: 2022, category: 'Scholarship & travel' },
  { title: 'ECE Graduate Program Academic Achievement Award (Best Thesis)', org: 'Rutgers University', year: 2020, category: 'Award', description: 'One of six recipients among 28 doctoral graduates in the 2019/20 school year.' },
  { title: 'Conference Travel Award', org: 'Rutgers School of Graduate Studies (2019–20)', year: 2020, category: 'Scholarship & travel' },
  { title: 'Chancellor’s Leadership Award', org: 'New Brunswick Chancellor’s Student Leadership Gala, Rutgers', year: 2019, category: 'Award', link: 'http://studentawards.rutgers.edu/2019-award-winners/' },
  { title: 'Travel grant, International Conference on Machine Learning (ICML)', org: 'ICML 2019', year: 2019, category: 'Scholarship & travel' },
  { title: 'ACM CRA-W Grad Cohort Scholarship', org: 'CRA-W', year: 2019, category: 'Scholarship & travel' },
  { title: 'ECE Research Excellence Award', org: 'Rutgers ECE', year: 2018, category: 'Award' },
  { title: 'Conference Travel Award', org: 'Rutgers School of Graduate Studies (2018–19)', year: 2018, category: 'Scholarship & travel' },
  { title: 'Microsoft Scholarship and Student Research Competition finalist', org: 'ACM Tapia Conference 2018, Orlando', year: 2018, category: 'Scholarship & travel' },
  { title: 'Google Conference Travel Award', org: 'Google', year: 2018, category: 'Scholarship & travel' },
  { title: 'Best Poster Award', org: 'ECE Research Day, Rutgers University', year: 2017, category: 'Award' },
  { title: 'TA/GA Professional Development Award', org: 'Rutgers University (four semesters, 2016–2017)', year: 2017, category: 'Award' },
  { title: 'Microsoft Scholarship', org: 'Grace Hopper Celebration of Women in Computing', year: 2016, category: 'Scholarship & travel' },
]);

add('grants', 'grt', [
  { title: 'Developing a Fab Lab at BUET', funder: 'UGC HEAT Project, Phase 1 (Window 4)', year: '2025' },
  { title: 'Basic Research Grant', funder: 'BUET', year: '2025' },
  { title: 'Plastic waste management', funder: 'Ministry of Science and Technology, Special Research Grant', year: '2023' },
  { title: 'Electronic waste management', funder: 'Ministry of Education, Research Grant for Higher Education', year: '2023–2025' },
  { title: 'AI-based healthcare system', funder: 'ICT Division, Innovation Grant', year: '2023' },
  { title: 'Smart home and office', funder: 'Ministry of Science and Technology, R&D Grant', year: '2023' },
  { title: 'Smart patient monitoring system', funder: 'University Grants Commission (UGC) Research Grant', year: '2022–2023' },
  { title: 'Basic Research Grant', funder: 'Research and Innovation Centre for Science and Engineering (RISE), BUET', year: '2021' },
]);

add('service', 'svc', [
  { role: 'Associate Editor', org: 'Frontiers in Digital Health', period: 'Current', type: 'Editorial' },
  { role: 'Associate Editor, “Fuzzy System Applications in Robotics and Automation”', org: 'Frontiers in Robotics and AI', period: '', type: 'Editorial' },
  { role: 'Treasurer', org: 'ICTP 2025, IEEE ComSoc Bangladesh Chapter', period: '2025', type: 'Conference' },
  { role: 'Publication Chair', org: 'IEEE ICICT 2024, IICT, BUET', period: '2024', type: 'Conference' },
  { role: 'Hybrid Session Design, Management and Digital Communication Chair', org: 'IEEE ICCIT 2023', period: '2023', type: 'Conference' },
  { role: 'Organizing Member, Sponsorship Sub-committee', org: 'IEEE ICTP 2021 and 2023', period: '2021, 2023', type: 'Conference' },
  { role: 'AI Program Committee Member', org: 'Virtual Grace Hopper Celebration 2021, USA', period: '2021', type: 'Conference' },
  { role: 'Newsletter Editor', org: 'IEEE Bangladesh Section ExCom', period: '2021 – 2023', type: 'Professional society' },
  { role: 'Secretary', org: 'IEEE Signal Processing Society, Bangladesh Chapter', period: '2021 – 2022', type: 'Professional society' },
  { role: 'Central Committee Member', org: 'International Robot Olympiad', period: '2021', type: 'Professional society' },
  { role: 'President', org: 'Society of Women Engineers, Graduate Executive Board, Rutgers', period: '2019 – 2020', type: 'Leadership' },
  { role: 'Vice President', org: 'Society of Women Engineers, Graduate Executive Board, Rutgers', period: '2017 – 2019', type: 'Leadership' },
  { role: 'Vice Chair', org: 'IEEE Women in Engineering, Bangladesh Section', period: '2010 – 2012', type: 'Leadership' },
  { role: 'Senior Member', org: 'IEEE', period: '2026 – Present', type: 'Membership' },
  { role: 'Member', org: 'IEEE', period: '2020 – 2025', type: 'Membership' },
  { role: 'Student Member', org: 'IEEE', period: '2010 – 2019', type: 'Membership' },
  { role: 'Member', org: 'ACM', period: '2017 – Present', type: 'Membership' },
]);

add('news', 'nws', [
  { title: 'Guest speaker at the UNESCO-TWAS roundtable at Trieste Next, Italy', date: 'Sep 2025', link: 'https://twas.org/article/artificial-intelligence-global-south' },
  { title: 'Featured by OWSD: a Bangladeshi engineer using AI to tackle autism', date: '2025', link: 'https://owsd.net/success-story/bangladeshi-engineer-uses-ai-tackle-autism' },
  { title: 'Received the Swapnajoyee Nari Award 2025 for AI and smart healthcare innovation', date: '2025' },
  { title: 'Treasurer, ICTP 2025 (IEEE ComSoc Bangladesh Chapter)', date: '2025' },
  { title: 'Publication Chair, IEEE ICICT 2024', date: '2024' },
  { title: 'Spoke on DBC News about challenges women face in STEM and choosing a career', date: '', link: 'https://www.facebook.com/DbcNewsDaily/videos/1237103607359753/' },
  { title: 'Guest on Channel I discussing the impact of higher studies in Bangladesh', date: 'Jan 2022' },
]);

add('team', 'tm', [
  { name: 'Mahmudul Mohtasim', position: 'Research Assistant', program: 'M.Sc. in ICT, IICT, BUET', status: 'Current', bio: 'B.Sc. in EEE from BUET. Works on AI tools that improve diagnosis and accessibility for children with autism spectrum disorder.', photo: gs('AMxu72u7yo0jPAnW8D0O6sJqCBMUv57Znpo_tX8SRFnCfY_i3_tuKbEFOV_I2UYLe0qFQiccOlft7VLRBcm0Krf_rrUAUAEyxUtNPA-ETTk_Lu4dfAT69jdQYsirhJ3EdiElvG2BWR4IX1gf7Soh7JKhNW9EZiqBXb21-kQKz5a0L-01kA46QnS2a6TdXhhMhlv-fyZwURmKYfVUglCbUEGbdX7vsGeXco_Wu_afRevmx1I', 600), interests: ['Autism', 'Wi-Fi CSI', 'Deep learning'] },
  { name: 'Ahsanul Islam', position: 'Research Assistant', program: 'M.Sc. in EEE, BUET', status: 'Current', bio: 'B.Sc. in EEE from KUET. Interested in machine learning, deep learning, signal processing and computer vision; regional winner of the National Undergraduate Math Olympiad (2018).', photo: gs('AMxu72vWOA7fXAwHyYu55htUgBjq2B2u-myc30RsB1pvWlADfDym9R8JYfRGyy_BTzPQhbDOebhz-cjYZpg5BrTOPiFzGKvYpsKss7pJq8BbFB77wKXGpWRymrHaI-1Qq2l3A4Ewh3KqGDkrr0iHe-VGldAV0puRg1q9Fi1irbT6Lows8JpOsNKalmizx1a39YGfsh1fe1MfRrdrOcF1HZGnb0VR-lMsiWONLFuwpl83bUo', 600), interests: ['Deep learning', 'Signal processing', 'Computer vision'] },
  { name: 'Sadia Akter', position: 'Research Assistant', program: 'M.Sc. in Management of Technology, IAT, BUET', status: 'Current', bio: 'B.Sc. in CSE from East West University and BUET Postgraduate Fellow. Works on optimising Wi-Fi signal strength through CSI analysis; honourable mention in the 2023 IEEE WIE Climate Tech Big Idea Pitch Competition.', photo: gs('AMxu72tWratHQgT-OEosV32VbMwl-gsHg8aGTZgu4m5TU0K5m4xF5LpeYopHXVhgBsEFcZ6BTCZn_NVZ_rNVNbBgBO37jvUJsQFShF8c-_xEmR5uMNoDt2jX03LMgUyXAVlxzAPxIHBfcsPc3H3UBePBaArXSaPxwjN8diwEr97xs3xv6sUSuEkJLRz0QmJpvps7znGRaFKz5yebUK5GfIAimhiXxxY4xQDheIm6YhVoynA', 600), interests: ['Blockchain', 'Wi-Fi CSI', 'Security'] },
  { name: 'A.S.M. Samiul Islam', position: 'Research Assistant', program: '', status: 'Current', bio: '' },
]);

add('collaborators', 'col', [
  { name: 'Bashir I. Morshed, Ph.D.', position: 'Associate Professor', affiliation: 'Department of Computer Science, Texas Tech University', link: 'http://www.depts.ttu.edu/cs/' },
  { name: 'Mamun Rashid, Ph.D.', position: 'Assistant Professor, Bioinformatics & ML', affiliation: 'University of Birmingham; MedAI, UK' },
  { name: 'Farzana Rahman, Ph.D.', position: 'Assistant Professor', affiliation: 'Kingston University, UK' },
  { name: 'Towhida Noor, MD', position: 'Consultant Dermatologist', affiliation: 'BSMMU, Dhaka' },
]);

add('gallery', 'gal', [
  { caption: 'UNESCO-TWAS roundtable, Trieste Next', year: '2025', image: gs('AMxu72ugyueBg3MHarocnvHDY9MAV2-FIcpA1olC9l4C-cXolh0Nk4XI6EPLGqbgeM5iDJxlPjKHPFuluCn82Y0gjO7bsuqpFj4uGRXe-Ojibp6QJ6icwyQ-1ZOZzJRvMOuUk0i_NMsOiE4_yw9LDA625AvevVIOlkWfjqikQFLzAjDJc0CyH8yDlTHnsuFk1wA_H78vrU2WBJDbBOP6oy3O8hzjCdeccn6D5wS1I8hsT4s'), link: 'https://twas.org/article/artificial-intelligence-global-south' },
  { caption: 'Speaking at Trieste Next, Italy', year: '2025', image: gs('AMxu72v8amEeUn_WneCjwQaUzVtXDUJEVylJS4vlwFBnMgjwoKP3Ukshv1z9zPmz9ZW3cuF0Ar4Y5dmBl8RB3fvakQoJdDYClgmsk-VuUYMVWyeEeHwMlboiPsthVo_fUSj3EUlszZQ7S3H6VMwRUBFppNme1T6uLcmm_PtoDP1G6L-7FX8Ft6qRfo9IFZaG64nM2yg_jtTCSZBmcKibKEpMkOqkwxQpdV2a50MJ8IYr9Kk') },
  { caption: 'Swapnajoyee Nari Award 2025', year: '2025', image: gs('AMxu72s-85yU_kfZhFYHJdL3JZBvWinsamNIUfWwh4pL9yadEIV9eV6LSaza5FXOiRvSPczCZr3TNbBSrlFqPGib7NcZJ9ylJaDGEn_Fl41an_xEn9xbDcYd0ZLDabW2zlrAy4a09S8cCvqWohnZea2wCEohVS94yW9Mg8bn_-YtFzbHeEWtmkPC9EUxKz_IZ7j2XRyayt-RZ2IDhxTUEksClnohIdDUjmUvlVgUpZcW') },
  { caption: 'Receiving the OWSD Early Career Fellowship in Trieste', year: '2023', image: gs('AMxu72vMnKA2T0N5GMzPqo_SYf6syDkHqNYSKuGyDMfTOwVvSvXUc37O8Expu91QEuXr0R-DvO4_D5_JYqCgPtpNoo3xstv1uK3tftAjm2SUrLnRrm5C4RzSdPXNDTkWWHVY9E4fArThh4ro94av2E3IkhM5yqlk0yQhRAzoUFOm4BLEz1OvP2zBXj5zVFISG8JTQFy-ipaELFgxr6wDaLX5znPVreZqIuo-m6vDXA4S') },
  { caption: 'BUET DSW recognition for the IEEE Signal Processing Cup team', year: '2022', image: gs('AMxu72tEVoyCsctg4UjunNs8FRyleywRuZayurvjtQv9WPBZHg9KBqgiM-IJU-rMBZmJTBHwWiPFD9sBkhQ2Q7cMJBO2ngcV13xo6xWYasgIuE9GHE6livToM4rlwoF4s8Nyb0_rBEKKy5NRPjIwyMIl6Zto4-HsxSz2rOLUvhoDiafA6oS5Xm1Rk-2mGTWUAQG64_RcA3Ohb-FI23bs2lcvGfeK26dFrxSpNA5vOJBp2Qw') },
  { caption: 'OWSD fellowship in the national press', year: '2023', image: gs('AMxu72sRXOBl_k6NKYQonsFttKDsVgVgbrTDBbU9Ph_-wxrDMm3I9yEBqyRpyYCvlZaqY8SCmX0MoYEXsZLuYCKnR6snAh1IRnE5vJQm4yMMCUZUmBKp5Ud1BsM_CPS5bB3JKojQmtyepRg8UDcc8BGdvOI8dlGWnZtfFqPfZt3BCS7k_wBfZ1aTIn00lgSBTcBpbOHyE1e8ahRn-lbBc3YX5x-_MElh_35ldDIhMPFyrKc') },
  { caption: 'Forum 86 Research Excellence Award', year: '2022', image: gs('AMxu72sexHVXLOdfaYOzRfmTixFd8XXuCzIFnoxBCC_j6OJ7cMf_FGYJdcs7pwZLak9Ys6eIbKIKB4WjGHqpDo3ifji-kD1sR4oNAiNU_ElYEEYZ2xBSUxf6E2-PBHN6ztYhcQNm56YlIMjC8R5Uyte9yNV077lxkyyd-btIJAnc6inlVvkfgijQeuHIWbegEthtBw6j7QAe3gIeCUbTu2TBAt9ZYmiwHqU85wneSyon6vA') },
  { caption: 'Guest on Channel I', year: '2022', image: gs('AMxu72vpA02KgMtpHiJbs9v4De6i_TKRAbSc3KiB-k7VwiaJgOPxFdQLov0QcsNBdVcWWEyzJDUPIjnqGrWmywDGLS2dwhTc9NCBhPi3TzTtEV0YWROxB3j0QUGccHR7uoQmdEIMG8MfAYOOml9BqfBW9Wp5kj4k-61BGuLKmR9DHzU0a5ntnEDpEIkejEFzQPE9FzUG5OnNcZHsGU99VKttYdh76bIaYPYdyMyQzOHBgFM') },
  { caption: 'ECE Graduate Program Academic Achievement Award', year: '2020', image: gs('AMxu72tqwLjQ4M7CT2gWNr5wIE6dMMdDxOiuvaeDWqqIvUyhJiSs2T4LX4jTc-5Kw6ZKMWk4jRYYBI3BlhsSfLwiczvQ-BXjF1viFQ2tsZ75w7o_iDn9FBive4l6b6_xXSH-6FromxJMgXZfJmLTatiugba4tH-rHDbujFab3X6wNtFr0Q9VmmlZ-ym_qBkLVKwFPwZVyFkm7b5hUfHTJmxjdPdmGNNArMlwNgK1UG8sbcU') },
  { caption: 'Chancellor’s Leadership Award, Rutgers', year: '2019', image: gs('AMxu72vuTJWCxgP8NnqxkvDZj4nIRmw0tB2YWQiG9V1QKYc4cf0pVGEVh6ncxMMwJE-Qo_8CPzp6LyhJ6UMQi8Z1IJvV48kHi2iaMAsLXTuad5-AV1_dgb8PMGu1F67EbsGqfWcJtY2qZD32h8yGyfpvj56D4hn2pESK9c2Lfymf9vfVuG9jHlip_y1VK7xuthZuHC1y86VSNkhN0ihUJkE') },
  { caption: 'ICASSP 2019, Brighton, UK', year: '2019', image: gs('AMxu72uLRIPCOZG7YBFnunT4ectOd7xojZjc0dKbLmrzqNiFZWLB263Hy0yrn7KMonY1WQKT0SUQ5KMKddgZq-gkw7eQsdfHYfb3tOzpwyn5X_1rHK2mT7bVnh8U5fARExZ64rrByDFnt8lB_o7KGQ9NQUSoy4vIlEhXVv0nVm85sMzVIC3_HAD7OCQdq_Qxl30ezaiOvYpdrhG15UMz') },
  { caption: 'Presenting at the Asilomar Conference, California', year: '2018', image: gs('AMxu72tvagMRZGYT6dS1mN2qdsJ5gg8TUTmjsfKXkgd_Km0P_4RfPHzVzw9y91Rko8PeATJrTD84eggaGOiKY_qtreunTAXxmfW5FKFhKd8gVtX81AVdtmxTbMdtLaFw4TrZMhJqLan8-YIZmH3XT-GjhlgBfOxGMD2wvdGuGGH8rt6tz8Fpobs6NfKlGezqrJ076-YqXPM579hmWQY7') },
  { caption: 'EUSIPCO, Rome', year: '2018', image: gs('AMxu72urjN0cybI4m4hE9Zmo7nvZxxKqNtn50l-RnDq1pKAPV9nuo27tAiZm89ppM7inqJvSoJ0s9RdlKRH1kbEDiBzmXGDi1Qhx5pPAqcZ7IqHKDllj_L-HLyfYagcy-ZSodibNRFMf81eD4FIV_nj_wjkHlS9AseF0yX56Es8v9ZRYXqxxSsj0niOy48DeEF1kkxmA4LScPHoSjcCl3Y-D-a3IP63JIr-J-hGJrWfIqNM') },
  { caption: 'EUSIPCO banquet, Rome', year: '2018', image: gs('AMxu72vTf2Pcx11z7eFydL7a4PYxESW-o9LLMw3JyCKZf8xFK7z2BG257H_l23FmrxlU650tEycvKsUVxGUyfmIOEjLlBxd8-E6_bnk-7c9wl8EIXEHcZcOXq1Juy5l1qrPK-Ps2ZW9yw4GvnLdiUplFfDNHOD9ECPkW5NJSMsw_MSFPx0gxxAdTNWaswOhP5FPE734fAF7pAYeDj1uabmY') },
  { caption: 'CRA-W Grad Cohort, Chicago', year: '2019', image: gs('AMxu72vE7_1AbmlFivs7OomrfVZTm3i1lNMS78lCE9NzsKUKQ_bJhZX15FJYfGnZZWfdkBSqUnqGjuRfQcdZJugmavNe_3kC_bxNVmjdRzJngf3CaxjVqOyPccdWYyxdehq6zkq9iR80zBIw23ldLOivj_beePm6MUmzTVD9ZeDsvygoYyQiFObaDuERK1eCgK-ZAhmbz-VZYbBmJNGpYe3_ZymKCGgnVl0VzqOERA3B0aE') },
  { caption: 'PhD defence, Rutgers', year: '2020', image: gs('AMxu72vVg5ZeWI-HCgaEtiE3vTDK3cNx49eOwM2-nq5Kx1Jdrr2Uz4Z0kcNOOmH4z0vmzaywlk9pIbzwM9i0eO36UJ7hbIVPdiL9lXEQHhTfpFddhBJkyjVrZJndN5LUhb5OZ2-0T16s8BqUY0-NR2QE3JZOlcvNi2ovTY8MhJv1jRyDkHN0lMhK3O3q4rrCDhuFbm4FztYmXemAHDuh'), description: 'Defended the PhD thesis on 12 March 2020.' },
]);

/* ------------------------------------------------------------------ */
/* Pages (tabs) and their sections                                     */
/* ------------------------------------------------------------------ */
/*
 * Sections only list what differs from the defaults in
 * src/lib/sections.js; normalizeSection() fills in the rest at render time.
 */

const BIO = `I am a Professor at the Institute of Appropriate Technology, Bangladesh University of Engineering and Technology (BUET). I received my Ph.D. in Electrical and Computer Engineering from Rutgers University, New Jersey, in 2020, and my M.Sc. (2012) and B.Sc. (2009) in Electrical and Electronic Engineering from BUET.

My research sits where signal processing, machine learning, wireless communication and the Internet of Things meet. I want to build an independent, multidisciplinary research programme in Bangladesh around smart cities, including smart healthcare, smart buildings and smart transportation, and around assistive living, using recent advances in AI and IoT.`;

const pages = [
  {
    id: 'home',
    title: 'Home',
    navLabel: 'Home',
    order: 0,
    inNav: true,
    header: { show: false },
    sections: [
      {
        id: 'home-hero',
        kind: 'hero',
        props: {
          name: 'Tahsina Farah Sanam, Ph.D.',
          roles: 'Professor, Institute of Appropriate Technology, BUET\nSenior Member, IEEE\nUNESCO-OWSD Early Career Fellow',
          bio: 'I work on AI, Wi-Fi sensing and the Internet of Things for smart healthcare, assistive living and smarter cities in Bangladesh.',
          image: PHOTO,
          imageAlt: 'Portrait of Dr. Tahsina Farah Sanam',
          keywords: 'Artificial intelligence, Machine learning, Internet of Things, Smart healthcare, Assistive living, Smart cities',
          buttons: [
            { label: 'About me', action: 'drawer', target: 'about', style: 'solid', icon: 'User' },
            { label: 'Research', action: 'drawer', target: 'research', style: 'outline', icon: 'Radar' },
            { label: 'Contact', action: 'drawer', target: 'contact', style: 'outline', icon: 'Mail' },
          ],
        },
      },
      {
        id: 'home-about',
        kind: 'richtext',
        heading: { title: 'About', subtitle: '' },
        props: {
          body: BIO,
          factsTitle: 'At a glance',
          facts: [
            { label: 'Position', value: 'Professor, IAT, BUET' },
            { label: 'Ph.D.', value: 'Rutgers University, 2020' },
            { label: 'Research group', value: '[Cyber Physical Intelligence Lab](https://sites.google.com/view/tahsina-cpi-lab/home)' },
            { label: 'Email', value: '[tahsina@iat.buet.ac.bd](mailto:tahsina@iat.buet.ac.bd)' },
          ],
        },
        viewAll: { show: true, label: 'Full profile', target: 'about', mode: 'drawer' },
      },
      {
        id: 'home-publications',
        kind: 'collection',
        heading: { title: 'Selected publications', subtitle: 'Recent journal and conference papers.' },
        props: { collection: 'publications', mode: 'citation', limit: 6, sortField: 'year', sortDir: 'desc', selection: 'filter', filterField: 'type', filterValue: 'Journal' },
        style: { tone: 'soft' },
        viewAll: { show: true, label: 'All publications', target: 'publications', mode: 'drawer' },
      },
      {
        id: 'home-research',
        kind: 'collection',
        heading: { title: 'Research', subtitle: 'Signal processing, machine learning, wireless communication and IoT, applied to problems close to home.' },
        props: { collection: 'research', mode: 'cards', columns: 3, limit: 6, bodyLines: 3 },
        viewAll: { show: true, label: 'Research in detail', target: 'research', mode: 'drawer' },
      },
      {
        id: 'home-experience',
        kind: 'collection',
        heading: { title: 'Experience' },
        props: { collection: 'experience', mode: 'timeline', limit: 5 },
        style: { tone: 'soft' },
        viewAll: { show: true, label: 'Full career', target: 'experience', mode: 'drawer' },
      },
      {
        id: 'home-awards',
        kind: 'collection',
        heading: { title: 'Awards and achievements' },
        props: { collection: 'awards', mode: 'minimal', limit: 8, sortField: 'year', sortDir: 'desc', showBody: false, showLinks: false },
        viewAll: { show: true, label: 'All awards', target: 'awards', mode: 'drawer' },
      },
    ],
  },
  {
    id: 'about',
    title: 'About',
    navLabel: 'About',
    order: 1,
    inNav: true,
    header: { show: true, title: 'About me', subtitle: 'Education, career and service.' },
    sections: [
      {
        id: 'about-bio',
        kind: 'richtext',
        heading: { show: false },
        props: { body: BIO, image: PHOTO, imageAlt: 'Dr. Tahsina Farah Sanam', imageSide: 'left', imageWidth: 32, imageShape: 'arch' },
      },
      {
        id: 'about-education',
        kind: 'collection',
        heading: { title: 'Education' },
        props: { collection: 'education', mode: 'timeline' },
        style: { tone: 'soft' },
      },
      {
        id: 'about-service',
        kind: 'collection',
        heading: { title: 'Service, leadership and memberships' },
        props: { collection: 'service', mode: 'minimal', groupBy: 'type' },
      },
    ],
  },
  {
    id: 'research',
    title: 'Research',
    navLabel: 'Research',
    order: 2,
    inNav: true,
    header: { show: true, title: 'Research', subtitle: 'Artificial intelligence, machine learning, IoT, AI-based healthcare, localization and tracking, smart city initiatives and speech processing.' },
    sections: [
      {
        id: 'research-areas',
        kind: 'collection',
        heading: { title: 'Areas' },
        props: { collection: 'research', mode: 'list', bodyLines: 0, showBody: true },
      },
      {
        id: 'research-stats',
        kind: 'stats',
        heading: { show: false },
        props: {
          items: [
            { label: 'Journal articles', source: 'publications', filterField: 'type', filterValue: 'Journal' },
            { label: 'Conference papers', source: 'publications', filterField: 'type', filterValue: 'Conference' },
            { label: 'US patent', source: 'publications', filterField: 'type', filterValue: 'Patent' },
            { label: 'Funded projects', source: 'grants' },
          ],
        },
        style: { tone: 'contrast', paddingTop: 56, paddingBottom: 56 },
      },
      {
        id: 'research-grants',
        kind: 'collection',
        heading: { title: 'Grants' },
        props: { collection: 'grants', mode: 'minimal' },
      },
      {
        id: 'research-collaborators',
        kind: 'collection',
        heading: { title: 'Collaborators' },
        props: { collection: 'collaborators', mode: 'cards', columns: 2, cardStyle: 'outline' },
        style: { tone: 'soft' },
      },
    ],
  },
  {
    id: 'publications',
    title: 'Publications',
    navLabel: 'Publications',
    order: 3,
    inNav: true,
    header: { show: true, title: 'Publications', subtitle: 'Patents, journal articles and conference papers. Select any entry for details and a citation.' },
    sections: [
      {
        id: 'pubs-all',
        kind: 'collection',
        heading: { show: false },
        props: { collection: 'publications', mode: 'citation', groupBy: 'type', showSearch: true, chipsField: 'year', sortField: 'year', sortDir: 'desc' },
      },
    ],
  },
  {
    id: 'experience',
    title: 'Experience',
    navLabel: 'Experience',
    order: 4,
    inNav: true,
    header: { show: true, title: 'Experience', subtitle: 'Academic and research positions.' },
    sections: [
      { id: 'exp-all', kind: 'collection', heading: { show: false }, props: { collection: 'experience', mode: 'timeline' } },
      { id: 'exp-teaching-edu', kind: 'collection', heading: { title: 'Education' }, props: { collection: 'education', mode: 'timeline' }, style: { tone: 'soft' } },
    ],
  },
  {
    id: 'awards',
    title: 'Awards',
    navLabel: 'Awards',
    order: 5,
    inNav: true,
    header: { show: true, title: 'Awards and honours', subtitle: 'Fellowships, awards, invited talks and scholarships.' },
    sections: [
      { id: 'awd-all', kind: 'collection', heading: { show: false }, props: { collection: 'awards', mode: 'minimal', groupBy: 'category' } },
      { id: 'awd-news', kind: 'collection', heading: { title: 'In the news' }, props: { collection: 'news', mode: 'minimal' }, style: { tone: 'soft' } },
    ],
  },
  {
    id: 'group',
    title: 'Research group',
    navLabel: 'Group',
    order: 6,
    inNav: true,
    header: { show: true, title: 'Research group', subtitle: 'Cyber Physical Intelligence (CPI) Laboratory' },
    sections: [
      {
        id: 'group-intro',
        kind: 'blocks',
        heading: { show: false },
        props: {
          blocks: [
            { id: 'b1', type: 'text', props: { markdown: 'The CPI Lab brings together graduate students at BUET working on wireless sensing, machine learning and IoT for healthcare and smart cities. Students interested in joining are welcome to get in touch.' } },
            { id: 'b2', type: 'buttons', props: { items: [
              { label: 'Visit the CPI Lab website', action: 'url', target: 'https://sites.google.com/view/tahsina-cpi-lab/home', style: 'solid', icon: 'FlaskConical' },
              { label: 'Ask about joining', action: 'drawer', target: 'contact', style: 'outline', icon: 'Mail' },
            ] } },
          ],
        },
        style: { paddingBottom: 24 },
      },
      { id: 'group-team', kind: 'collection', heading: { title: 'Research assistants' }, props: { collection: 'team', mode: 'cards', columns: 3, imageAspect: '1/1', bodyLines: 4 } },
    ],
  },
  {
    id: 'gallery',
    title: 'Gallery',
    navLabel: 'Gallery',
    order: 7,
    inNav: true,
    header: { show: true, title: 'Gallery', subtitle: 'Conferences, awards and talks.' },
    sections: [{ id: 'gal-all', kind: 'collection', heading: { show: false }, props: { collection: 'gallery', mode: 'masonry', columns: 3 } }],
  },
  {
    id: 'contact',
    title: 'Contact',
    navLabel: 'Contact',
    order: 8,
    inNav: true,
    header: { show: true, title: 'Contact', subtitle: 'For research collaboration, supervision and speaking requests.' },
    sections: [{ id: 'contact-main', kind: 'contact', heading: { show: false }, props: {} }],
  },
];

const seed = { config, schema, pages, items };
export default seed;
