'use strict';

const REGIONS = ['Mid Wales', 'North Wales', 'Cheshire'];
const VERIFICATION_STATUSES = ['verified', 'partially_verified', 'needs_review'];
const PARENT_ORIGINS = ['https://bluedawncommercial.co.uk', 'https://www.bluedawncommercial.co.uk'];
const RESIZE_ACK_TYPE = 'blue-dawn-guide:resize-ack';
const IS_LOCAL_DEVELOPMENT = ['localhost', '127.0.0.1'].includes(window.location.hostname);
const PREVIEW_MODE = IS_LOCAL_DEVELOPMENT && new URLSearchParams(window.location.search).get('preview') === 'proposed';
const STAGES = [
  {
    id: 1,
    number: '01',
    title: 'Find & Assess',
    description: 'Commercial estate agents, surveyors and other professionals who can help identify and assess suitable property.',
    categories: ['Commercial Estate Agents', 'Chartered Surveyors', 'Commercial Valuers']
  },
  {
    id: 2,
    number: '02',
    title: 'Finance & Acquire',
    description: 'Finance brokers, lenders, solicitors, valuers and advisers involved in funding and completing a property transaction.',
    categories: ['Commercial Finance Brokers', 'Commercial Lenders', 'Commercial Solicitors', 'Commercial Valuers', 'Accountants', 'Tax Advisers']
  },
  {
    id: 3,
    number: '03',
    title: 'Plan & Develop',
    description: 'Architects, planning consultants, quantity surveyors, engineers, project managers and construction professionals.',
    categories: ['Architects', 'Architectural Matching Services', 'Planning Consultants', 'Quantity Surveyors', 'Structural Engineers', 'Civil Engineers', 'Building Services Engineers', 'Project Managers', 'Construction Contractors', 'Building Surveyors']
  },
  {
    id: 4,
    number: '04',
    title: 'Tax & Structure',
    description: 'Accountants and tax advisers support ownership and tax decisions; capital allowances reviews identify qualifying property expenditure; solicitors and ownership advisers guide legal and investment structures.',
    categories: ['Accountants', 'Tax Advisers', 'Capital Allowances Specialists', 'VAT Specialists', 'Commercial Property Solicitors', 'Property Investment and Ownership Advisers']
  },
  {
    id: 5,
    number: '05',
    title: 'Protect',
    description: 'Commercial insurance, risk management, health and safety, fire safety and security specialists.',
    categories: ['Commercial Insurance Brokers', 'Property Risk Consultants', 'Health and Safety Consultants', 'Fire Safety Specialists', 'Building Compliance Specialists', 'Security Specialists']
  },
  {
    id: 6,
    number: '06',
    title: 'Manage & Operate',
    description: 'Property managers, facilities management, maintenance, energy, connectivity and other ongoing property services.',
    categories: ['Property Management Companies', 'Facilities Management Providers', 'Commercial Maintenance Providers', 'Energy Consultants', 'IT and Connectivity Providers', 'Commercial Cleaning Providers']
  }
];
const CATEGORIES = Array.from(new Set(STAGES.flatMap((stage) => stage.categories))).sort((a, b) => a.localeCompare(b));
const MOBILE_CATEGORY_LABELS = new Map([
  ['Property Investment and Ownership Advisers', 'Property Investment']
]);

const elements = {
  previewBanner: document.getElementById('preview-banner'),
  capitalAllowancesCta: document.getElementById('capital-allowances-cta'),
  stageButtons: Array.from(document.querySelectorAll('.stage-card')),
  stageNumber: document.getElementById('active-stage-number'),
  stageTitle: document.getElementById('active-stage-title'),
  stageDescription: document.getElementById('active-stage-description'),
  stageCategories: document.getElementById('stage-categories'),
  form: document.getElementById('directory-filters'),
  search: document.getElementById('search-input'),
  region: document.getElementById('region-filter'),
  category: document.getElementById('category-filter'),
  stage: document.getElementById('stage-filter'),
  clear: document.getElementById('clear-filters'),
  viewAll: document.getElementById('view-all-businesses'),
  count: document.getElementById('results-count'),
  grid: document.getElementById('listing-grid'),
  empty: document.getElementById('empty-state'),
  emptyTitle: document.getElementById('empty-title'),
  emptyDescription: document.getElementById('empty-description'),
  error: document.getElementById('data-error')
};

let professionals = [];
let proposedIds = new Set();
let singleBusinessId = '';
function populateSelect(select, options) {
  options.forEach((value) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    select.append(option);
  });
}

function updateCategorySelectLabels() {
  const useCompactLabels = window.matchMedia('(max-width: 430px)').matches;
  Array.from(elements.category.options).forEach((option) => {
    const fullLabel = option.value || option.textContent;
    option.textContent = useCompactLabels
      ? MOBILE_CATEGORY_LABELS.get(fullLabel) || fullLabel
      : fullLabel;
  });
}

function selectStage(stageId, updateFilter) {
  const stage = STAGES.find((item) => item.id === Number(stageId));
  if (!stage) return;
  elements.stageButtons.forEach((button) => {
    const selected = button.dataset.stage === String(stage.id);
    button.classList.toggle('is-active', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  elements.stageNumber.textContent = stage.number;
  elements.stageTitle.textContent = stage.title;
  elements.stageDescription.textContent = stage.description;
  elements.capitalAllowancesCta.hidden = stage.id !== 4;
  elements.stageCategories.replaceChildren();
  stage.categories.forEach((category) => {
    const chip = document.createElement('button');
    chip.className = 'category-chip';
    chip.type = 'button';
    chip.textContent = category;
    chip.setAttribute('aria-label', `Filter directory by ${category}`);
    chip.addEventListener('click', () => {
      elements.category.value = category;
      renderListings();
      document.getElementById('directory').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    elements.stageCategories.append(chip);
  });
  if (updateFilter) {
    elements.stage.value = stage.id;
    if (!stage.categories.includes(elements.category.value)) {
      elements.category.value = '';
    }
    renderListings();
  }
}

function clearActiveStageDisplay() {
  elements.stageButtons.forEach((button) => {
    button.classList.remove('is-active');
    button.setAttribute('aria-pressed', 'false');
  });
  elements.capitalAllowancesCta.hidden = true;
  elements.stageNumber.textContent = '—';
  elements.stageTitle.textContent = 'Explore all stages';
  elements.stageDescription.textContent = 'Choose a stage above to understand the expertise that may be relevant to your project.';
  elements.stageCategories.replaceChildren();
}

function validProfessionals(value) {
  return Array.isArray(value) && value.every((item) =>
    item && typeof item === 'object' &&
    typeof item.id === 'string' &&
    typeof item.name === 'string' &&
    (item.guide_owner === undefined || typeof item.guide_owner === 'boolean') &&
    typeof item.description === 'string' &&
    typeof item.website === 'string' &&
    typeof item.logo === 'string' &&
    typeof item.last_verified === 'string' &&
    (!item.last_verified || /^\d{4}-\d{2}-\d{2}$/.test(item.last_verified)) &&
    VERIFICATION_STATUSES.includes(item.verification_status) &&
    Array.isArray(item.source_urls) && item.source_urls.every((url) => typeof url === 'string') &&
    Array.isArray(item.review_notes) && item.review_notes.every((note) => typeof note === 'string') &&
    Array.isArray(item.categories) && item.categories.every((category) => typeof category === 'string') &&
    Array.isArray(item.regions) && item.regions.every((region) => typeof region === 'string') &&
    Array.isArray(item.stages) && item.stages.every((stage) => STAGES.some((known) => known.id === stage)) &&
    typeof item.featured === 'boolean'
  );
}

function safeWebsiteUrl(value) {
  if (typeof value !== 'string' || value.trim() === '') return '';
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : '';
  } catch {
    return '';
  }
}

function getInitials(name) {
  return name.trim().split(/\s+/).filter((part) => /[A-Za-z0-9]/.test(part)).slice(0, 2).map((part) => part.charAt(0)).join('').toUpperCase();
}

function getListingCardId(businessId) {
  return `business-${businessId}`;
}

function scrollToSharedListing(card) {
  const scrollIntoView = () => {
    window.requestAnimationFrame(() => {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  };
  if (window.parent === window) {
    scrollIntoView();
    return;
  }

  let acknowledged = false;
  let fallbackTimer;
  const handleResizeAck = (event) => {
    const data = event.data;
    if (event.source !== window.parent || !PARENT_ORIGINS.includes(event.origin) ||
        !data || typeof data !== 'object' || data.type !== RESIZE_ACK_TYPE) return;
    acknowledged = true;
    window.clearTimeout(fallbackTimer);
    window.removeEventListener('message', handleResizeAck);
    scrollIntoView();
  };
  window.addEventListener('message', handleResizeAck);
  sendHeight();

  fallbackTimer = window.setTimeout(() => {
    if (acknowledged) return;
    window.removeEventListener('message', handleResizeAck);
    // Keep fallback scrolling inside this frame if the host does not acknowledge the resize.
    const top = card.getBoundingClientRect().top + window.scrollY - 24;
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }, 1500);
}

function createListingCard(professional) {
  const card = document.createElement('article');
  card.className = 'listing-card';
  card.id = getListingCardId(professional.id);

  const top = document.createElement('div');
  top.className = 'listing-card-top';
  const logo = document.createElement('div');
  logo.className = 'listing-logo';
  if (typeof professional.logo === 'string' && professional.logo.trim()) {
    const image = document.createElement('img');
    image.src = professional.logo;
    image.alt = '';
    image.loading = 'lazy';
    image.addEventListener('error', () => {
      logo.replaceChildren(document.createTextNode(getInitials(professional.name)));
    }, { once: true });
    logo.append(image);
  } else {
    logo.textContent = getInitials(professional.name);
  }
  const heading = document.createElement('div');
  const name = document.createElement('h3');
  name.className = 'listing-name';
  name.textContent = professional.name;
  const category = document.createElement('p');
  category.className = 'listing-category';
  category.textContent = professional.categories.join(' · ');
  heading.append(name, category);
  top.append(logo, heading);

  const tags = document.createElement('div');
  tags.className = 'listing-meta';
  professional.regions.forEach((region) => {
    const tag = document.createElement('span');
    tag.className = 'listing-tag';
    tag.textContent = region;
    tags.append(tag);
  });
  const linkUrl = safeWebsiteUrl(professional.website);
  if (professional.guide_owner === true) card.classList.add('is-guide-owner');
  card.append(top);
  if (professional.guide_owner === true) {
    const ownerBadge = document.createElement('p');
    ownerBadge.className = 'guide-owner-badge';
    ownerBadge.textContent = 'Guide owner & publisher';
    card.append(ownerBadge);
  }
  if (proposedIds.has(professional.id)) {
    const badge = document.createElement('p');
    badge.className = 'proposal-badge';
    badge.textContent = 'Proposed listing · review required';
    card.append(badge);
  }
  if (professional.description.trim()) {
    const description = document.createElement('p');
    description.className = 'listing-description';
    description.textContent = professional.description;
    card.append(description);
  }
  if (professional.regions.length) card.append(tags);
  if (linkUrl) {
    const link = document.createElement('a');
    link.className = 'listing-link';
    link.href = linkUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'Visit website ↗';
    card.append(link);
  }
  return card;
}

function renderListings() {
  const query = elements.search.value.trim().toLocaleLowerCase();
  const region = elements.region.value;
  const category = elements.category.value;
  const stage = elements.stage.value;
  const matches = professionals.filter((professional) => {
    const searchable = [professional.name, professional.description, ...professional.categories].join(' ').toLocaleLowerCase();
    return (!singleBusinessId || professional.id === singleBusinessId) &&
      (!query || searchable.includes(query)) &&
      (!region || professional.regions.includes(region)) &&
      (!category || professional.categories.includes(category)) &&
      (!stage || professional.stages.includes(Number(stage)));
  });
  matches.sort((a, b) => Number(b.guide_owner === true) - Number(a.guide_owner === true));

  elements.grid.replaceChildren(...matches.map(createListingCard));
  elements.count.textContent = `${matches.length} ${matches.length === 1 ? 'company' : 'companies'} found`;
  elements.grid.setAttribute('aria-busy', 'false');
  const hasFilters = Boolean(query || region || category || stage);
  elements.empty.hidden = matches.length > 0;
  const selectedStage = STAGES.find((item) => item.id === Number(stage));
  const stageHasListings = selectedStage && professionals.some((professional) => professional.stages.includes(selectedStage.id));
  elements.emptyTitle.textContent = selectedStage && !stageHasListings
    ? 'Listings for this stage are being added'
    : hasFilters ? 'No matching businesses' : 'No businesses listed yet';
  elements.emptyDescription.textContent = selectedStage && !stageHasListings
    ? 'No businesses have been added for this stage yet. Check back as verified professionals are included.'
    : hasFilters
      ? 'Try adjusting your search or clearing one or more filters.'
      : 'The directory is ready to grow. Check back as verified local professionals are added.';
  window.requestAnimationFrame(sendHeight);
}

function clearFilters() {
  elements.search.value = '';
  elements.region.value = '';
  elements.category.value = '';
  const selectedStage = STAGES.find((stage) => stage.id === Number(elements.stage.value));
  if (selectedStage) {
    selectStage(selectedStage.id, false);
  } else {
    clearActiveStageDisplay();
  }
  renderListings();
}

function viewAllBusinesses() {
  singleBusinessId = '';
  elements.viewAll.hidden = true;
  elements.search.value = '';
  elements.region.value = '';
  elements.category.value = '';
  elements.stage.value = '';
  clearActiveStageDisplay();

  const url = new URL(window.location.href);
  url.searchParams.delete('business');
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  renderListings();
}

async function loadDirectory() {
  try {
    const response = await fetch('data/professionals.json');
    if (!response.ok) throw new Error(`Directory request failed (${response.status})`);
    const existing = await response.json();
    if (!validProfessionals(existing)) throw new Error('Directory data does not match the expected format');
    let records = existing;
    if (PREVIEW_MODE) {
      const proposedResponse = await fetch('data/proposed-professionals.json');
      if (!proposedResponse.ok) throw new Error(`Proposed directory request failed (${proposedResponse.status})`);
      const proposed = await proposedResponse.json();
      if (!validProfessionals(proposed)) throw new Error('Proposed directory data does not match the expected format');
      const existingIds = new Set(existing.map((item) => item.id));
      const existingNames = new Set(existing.map((item) => item.name.trim().toLocaleLowerCase()));
      const seenProposedIds = new Set();
      const seenProposedNames = new Set();
      if (proposed.some((item) => {
        const name = item.name.trim().toLocaleLowerCase();
        const duplicate = existingIds.has(item.id) || existingNames.has(name) ||
          seenProposedIds.has(item.id) || seenProposedNames.has(name);
        seenProposedIds.add(item.id);
        seenProposedNames.add(name);
        return duplicate;
      })) {
        throw new Error('Proposed directory contains a duplicate ID or business name');
      }
      proposedIds = new Set(proposed.map((item) => item.id));
      records = [...existing, ...proposed];
      elements.previewBanner.textContent = `Development preview · Includes ${proposed.length} proposed listings for review. Proposed businesses are not approved and are not part of the published directory.`;
      elements.previewBanner.hidden = false;
    }
    professionals = records.filter((item) =>
      item.categories.every((itemCategory) => CATEGORIES.includes(itemCategory)) &&
      item.regions.every((itemRegion) => REGIONS.includes(itemRegion))
    );
    const businessId = new URLSearchParams(window.location.search).get('business');
    const sharedBusiness = professionals.find((item) => item.id === businessId);
    singleBusinessId = sharedBusiness ? sharedBusiness.id : '';
    elements.viewAll.hidden = !sharedBusiness;
    if (sharedBusiness) {
      elements.search.value = '';
      elements.region.value = '';
      elements.category.value = '';
      elements.stage.value = '';
      clearActiveStageDisplay();
    }
    renderListings();
    if (sharedBusiness) {
      const card = document.getElementById(getListingCardId(sharedBusiness.id));
      if (card) {
        card.classList.add('is-shared-target');
        scrollToSharedListing(card);
      }
    }
  } catch (error) {
    console.error('Unable to load professionals directory:', error);
    elements.grid.setAttribute('aria-busy', 'false');
    elements.grid.replaceChildren();
    elements.count.textContent = 'Directory unavailable';
    elements.empty.hidden = true;
    elements.error.hidden = false;
  }
}


function sendHeight() {
  if (window.parent === window) return;

  const height = Math.ceil(
    document.body.lastElementChild?.getBoundingClientRect().bottom
    || document.body.scrollHeight
  );

  const message = {
    type: 'blue-dawn-guide:resize',
    height: height
  };

  PARENT_ORIGINS.forEach((origin) => {
    window.parent.postMessage(message, origin);
  });
}

function initialise() {
  populateSelect(elements.region, REGIONS);
  populateSelect(elements.category, CATEGORIES);
  updateCategorySelectLabels();
  window.addEventListener('resize', updateCategorySelectLabels);
  STAGES.forEach((stage) => {
    const option = document.createElement('option');
    option.value = String(stage.id);
    option.textContent = `${stage.number} ${stage.title}`;
    elements.stage.append(option);
  });

  elements.stageButtons.forEach((button) => {
    button.addEventListener('click', () => selectStage(button.dataset.stage, true));
  });
  [elements.search, elements.region, elements.category].forEach((control) => {
    control.addEventListener(control === elements.search ? 'input' : 'change', renderListings);
  });
  elements.stage.addEventListener('change', () => {
    const selectedStage = STAGES.find((stage) => stage.id === Number(elements.stage.value));
    if (selectedStage) selectStage(selectedStage.id, true);
    else {
      clearActiveStageDisplay();
      renderListings();
    }
  });
  elements.clear.addEventListener('click', clearFilters);
  elements.viewAll.addEventListener('click', viewAllBusinesses);
  elements.form.addEventListener('submit', (event) => event.preventDefault());
  selectStage(1, true);
  loadDirectory();

  if ('ResizeObserver' in window) {
    new ResizeObserver(() => window.requestAnimationFrame(sendHeight)).observe(document.body);
  } else {
    window.addEventListener('load', sendHeight);
    window.addEventListener('resize', sendHeight);
  }
}

initialise();
