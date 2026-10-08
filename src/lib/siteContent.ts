// Static marketing content for the public website (ported from the legacy PHP site).

export const CONTACT = {
    company: 'Global Air Cargo & Logistics Ltd',
    email: 'info@globalaircargoke.net',
    supportEmail: 'support@globalaircargoke.net',
    phones: ['+254 728 744 300', '+254 737 450 114'],
    address: 'Bruce House, Ground Floor, Nairobi, Kenya',
    whatsapp: '254737450114',
    facebook: 'https://www.facebook.com/Global-Air-Cargo-Logistics-107490928548499',
    mapEmbed: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3988.8132384039072!2d36.81815811475401!3d-1.28608869906197!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x182f11707c3392f3%3A0x99b72b16ce59c61a!2sBruce%20House!5e0!3m2!1sen!2ske!4v1647339721434!5m2!1sen!2ske',
};

export const OFFICES = [
    {
        region: 'Kenya',
        name: 'Headquarters — Nairobi',
        lines: ['Bruce House, Ground Floor', 'Nairobi, Kenya'],
        phones: ['+254 728 744 300', '+254 737 450 114'],
    },
    {
        region: 'Somalia',
        name: 'Mogadishu Office',
        lines: ['Movcon, Halane', 'Mogadishu Airport'],
        phones: ['+252 616 774 004'],
    },
    {
        region: 'Somalia',
        name: 'Bossaso Office (Galkayo & Garowe)',
        lines: ['Bossaso, Somalia'],
        phones: ['+252 907 795990', '+252 907 752383', '+252 907 731996', '+252 907 795425'],
    },
    {
        region: 'UAE',
        name: 'Dubai Office',
        lines: ['404 - DNIR Building, Port Saeed, Deira', 'P.O. Box 121109 Dubai, UAE'],
        phones: ['+971 503 229 440'],
    },
];

export const OPENING_HOURS = [
    { day: 'Monday – Friday', hours: '08:00 a.m – 05:00 p.m' },
    { day: 'Saturday – Sunday', hours: 'Closed' },
];

export const COMPANY_LINKS = [
    { href: '/about', label: 'About Us' },
    { href: '/company-history', label: 'Company History' },
    { href: '/partners', label: 'Partners' },
    { href: '/testimonials', label: 'Testimonials' },
];

export const AREAS_OF_OPERATION = [
    {
        title: 'Major cities in Somalia',
        places: ['Mogadishu', 'Guriel', 'Adado', 'Abudwaq', 'Dhusamareb', 'Galkayo', 'Garowe', 'Bossaso', 'Buhodle', 'Taleh', 'Kismayo', 'Gedo', 'Hudur', 'Garbaharey', 'Baidoa', 'Dollow', 'Beledweyne', 'Bulo Burde', 'Hargeisa', 'Barawe', 'Jowhar', 'Luq', 'Dhobley', 'Wajid'],
    },
    {
        title: 'Northern Kenya towns',
        places: ['Baragoi', 'Moyale', 'Wajir', 'Mandera', 'Garissa', 'Loiyangalani'],
    },
    {
        title: 'Other countries',
        places: ['South Sudan', 'Rwanda', 'South Africa', 'UAE – Dubai', 'Sudan', 'Chad', 'Tanzania', 'Djibouti', 'DR Congo', 'Republic of the Congo'],
    },
];

export const HERO_SLIDES = [
    {
        id: 'charter',
        title: 'Flight Air Charter Services',
        subtitle: 'If low costs matter for your shipment, try our sea freight services.',
        image: '/site/slides/7.jpg',
        cta: 'Read More',
        cta_link: '/about',
    },
    {
        id: 'bulk',
        title: 'Bulk Cargo Handling',
        subtitle: 'The road transport industry is the backbone of strong economies and dynamic societies.',
        image: '/site/slides/2.jpg',
        cta: 'Read More',
        cta_link: '/about',
    },
    {
        id: 'forwarding',
        title: 'Freight Forwarding and Clearance',
        subtitle: 'Warehouse services can be offered as a single service or combined with transportation.',
        image: '/site/slides/8.jpg',
        cta: 'Read More',
        cta_link: '/about',
    },
];

export const CLIENTS = [
    { name: 'ACF International', logo: '/site/client/c1.png' },
    { name: 'CISP', logo: '/site/client/c2.png' },
    { name: 'CESVI', logo: '/site/client/c3.png' },
    { name: 'International Rescue Committee', logo: '/site/client/c4.png' },
    { name: 'International Organization for Migration', logo: '/site/client/c5.png' },
    { name: 'Norwegian Red Cross', logo: '/site/client/c8.png' },
    { name: 'Danish Red Cross', logo: '/site/client/c9.png' },
    { name: 'US Embassy', logo: '/site/client/c20.png' },
    { name: 'International Development Law Organization', logo: '/site/client/c11.png' },
    { name: 'International Medical Corps', logo: '/site/client/c18.png' },
    { name: 'Medair', logo: '/site/client/c14.png' },
    { name: 'World Vision International', logo: '/site/client/c19.png' },
];

export const PARTNERS = [
    { name: 'Logistics', logo: '/site/client/1.png' },
    { name: 'Royal Resort', logo: '/site/client/2.png' },
    { name: 'Hexagon', logo: '/site/client/3.png' },
    { name: 'Plusinfinit', logo: '/site/client/4.png' },
    { name: 'Overseas Transport', logo: '/site/client/5.png' },
    { name: 'Construction Solutions', logo: '/site/client/6.png' },
    { name: 'Mediterranean Shipping Company', logo: '/site/client/7.png' },
    { name: 'Maersk', logo: '/site/client/8.png' },
];

export const HOME_TESTIMONIALS = [
    {
        quote: 'Global Air provides a brilliant, hassle-free service and I would highly recommend them to anyone. We have been using them for a couple of years now and could not fault the service in any way. They are very friendly, extremely helpful and as the name says – quick! A great company.',
        author: 'Lara M',
        role: 'Client',
    },
    {
        quote: 'Global Air have been an excellent partner over the years. The team has extensive experience and the service is second to none. If we ever have a problem, the team is always available to help resolve the issue in a timely fashion. Our relationship has resulted in a win-win situation for our business.',
        author: 'Technologies Ltd',
        role: 'Exporter – Electronics',
    },
    {
        quote: 'We would love to thank you for your efficiency of this shipment. Our client was very pleased with your service, we will be cooperating again with you soon.',
        author: 'Asia Access Express',
        role: 'Overseas Partner – Asia',
    },
    {
        quote: 'Thank you for excellent service. You will sure be hearing from us soon.',
        author: 'Vasaspedition',
        role: 'Overseas Partner – Finland',
    },
];

export const TESTIMONIALS = [
    {
        author: 'Bahsan Suheila',
        quote: 'Global Air Cargo is great to work with. They have convenient locations in Somalia, competitive rates, and their staff is excellent and will go above and beyond for their partners. I look forward to working with them in the future. Thank you!',
    },
    {
        author: 'Ali Ahmed Maalim',
        quote: 'Thank you for delivering the chairs to us so quickly. Your delivery guys were most helpful and courteous. You have been a pleasure to deal with and we will not hesitate to use your services again or recommend you.',
    },
    {
        author: 'Thompson Friction Welding Ltd',
        quote: 'I hauled my first load with Global Air in early 2016. I have continued to work with Global Air because of the great job they do for me! The Somalia office has been committed to keeping me rolling consistently with the best available freight they can offer. I look forward to continued success with my Global Air Cargo Logistics partnership.',
    },
    {
        author: 'Douglas Amundson Trucking, Inc.',
        quote: 'I have been loading our trucks/cars for years now with Global Air Cargo and I have found them to be very easy and accommodating to work with. I hope to be able to do a lot more business with them in the future as they continue to impress with their honesty and availability of loads.',
    },
    {
        author: 'L M Garrington (Mrs)',
        quote: "We have always found them to be highly professional and reliable, and they have assisted us in delivering a high standard of service to our customers. Global Air Cargo have been a valuable supplier to NGOs and continue to be so.",
    },
    {
        author: 'Materials Control',
        quote: 'We have been doing business with Global Air Cargo for many years and I would say the thing I like most about them is the staff. Whenever I get rates, request a load from dispatch or deal with sales, everyone is always courteous and quick to respond to our needs.',
    },
];

export type GalleryCategory = 'Warehouse' | 'Cargo' | 'Transport' | 'Logistics';

export const GALLERY: { title: string; category: GalleryCategory; image: string }[] = [
    { title: 'Warehouse', category: 'Warehouse', image: '/site/portfolio/warehouse.jpg' },
    { title: 'Cargo photos 2016', category: 'Cargo', image: '/site/portfolio/cargo.jpg' },
    { title: 'Sea delivery', category: 'Transport', image: '/site/portfolio/sea.jpg' },
    { title: 'Logistics photos 2016', category: 'Logistics', image: '/site/portfolio/logistics.jpg' },
    { title: 'Air delivery', category: 'Transport', image: '/site/portfolio/air.jpg' },
    { title: 'Transport photos', category: 'Transport', image: '/site/portfolio/transport.png' },
    { title: 'Cargo photos', category: 'Cargo', image: '/site/portfolio/cargo2.jpg' },
    { title: 'Logistics photos', category: 'Logistics', image: '/site/portfolio/logistics2.jpg' },
    { title: 'Warehouse', category: 'Warehouse', image: '/site/portfolio/warehouse2.jpeg' },
];

// ── Services ─────────────────────────────────────────────────────────────────

export type ServiceSection =
    | { type: 'features'; heading: string; items: { title: string; text: string }[] }
    | { type: 'tabs' | 'accordion'; heading?: string; items: { title: string; lead?: string; paragraphs?: string[]; points?: string[]; footer?: string }[] }
    | { type: 'lists'; items: { heading: string; image: string; points: string[] }[] };

export interface Service {
    slug: string;
    title: string;
    icon: 'Plane' | 'Ship' | 'Package' | 'Truck' | 'Warehouse' | 'Forward' | 'Monitor';
    summary: string;
    cardImage: string;
    images: string[];
    overview: string[];
    sections: ServiceSection[];
}

export const SERVICES: Service[] = [
    {
        slug: 'packaged-goods-transport',
        title: 'Packaged Goods Transport',
        icon: 'Package',
        summary: 'Focuses on the packaging requirements of goods in transit, in particular for items travelling overland by road or rail.',
        cardImage: '/site/services/1.jpg',
        images: ['/site/services/s1.jpg', '/site/services/s2.jpg'],
        overview: [
            'We will be able to pick up your sea freight consignment from almost anywhere for consolidation to most international cities and move all types of consolidated sea freight including boxes, crates, pallets, pharmaceuticals, motor cycles, jet skis — the list is endless.',
            'Countries like Germany, France, Portugal, United Kingdom, Italy and Benelux have been the first to consolidate in recent years to provide services with Poland, Czech Rep., Russia, Slovenia, Hungary and the Baltic countries; offering daily departures for some of them and weekly departures for others.',
            'Our technical and human teams are prepared for transporting conventional goods as well as ADR classified chemicals and goods requiring temperature control during transport; being able to offer storage solutions for such goods.',
            'We offer outsourcing of logistics services to our clients, from their production chain to delivery to the final destination.',
        ],
        sections: [
            {
                type: 'tabs',
                items: [
                    { title: 'Protection', paragraphs: ['First and foremost, transport packaging must serve to protect goods in transit. Given the nature of road and rail infrastructure, transport packaging should be manufactured so as to absorb unintended shocks, impacts or accidents of any kind, as well as protect against the elements such as humidity, excessive temperatures or heavy weather.'] },
                    { title: 'Versatility', paragraphs: ['Transport packaging must take into account the possibility of multiple stages in transit before the product reaches its final destination. This includes multiple off-loading, re-packaging, re-loading and possibly storage of the product(s). Transport packaging should thus be versatile enough to facilitate this process when necessary.'] },
                    { title: 'Customized solutions', paragraphs: ['Transport packaging should be as individual as the product itself and perfectly match the product’s consistency, size and dimensions. The focus here is on packaging that is lightweight, robust, easy to handle and that takes up as little space as possible.'] },
                ],
            },
        ],
    },
    {
        slug: 'air-charter-flights',
        title: 'Air Charter Flights',
        icon: 'Plane',
        summary: 'We operate charter flights across Somalia — Mogadishu to Guriel, Adado, Abudwaq, Dhusamareb and beyond — with connections you can trust.',
        cardImage: '/site/services/2.jpg',
        images: ['/site/services/s7.jpg'],
        overview: [
            'When it comes to Air Charter Flights transport services, Global Air Cargo has connections you can trust.',
            'Do you have valuable cargo that needs to be delivered ASAP? Whether you’re transporting bulk goods or a confidential secured consignment, Global Air Cargo & Logistics privately owned jets will arrange for it to be delivered anywhere in the East African Region. We’ll even take care of the ground transportation to ensure it reaches the intended destination safely and securely.',
            'Our customers have been placing their trust in the experience and quality standards of our Multimodal Transport Services department for years. The department handles national and international transports and optimises transport chains to the region’s key ports. The integration of all our locations means that the majority of transported containers are delivered or collected using our own trucks. This guarantees consistently high quality of the supply chain.',
            'Our customers in this transport segment appreciate the advantage of having only one “port of call”.',
        ],
        sections: [
            {
                type: 'features',
                heading: 'The benefits of Air Charter Flights',
                items: [
                    { title: 'Competitive edge', text: 'Depending on your volumes and requirements, Global Air Cargo brings you the means of transport that is most competitive for your business.' },
                    { title: 'Expertise', text: 'A single contact to provide you with precise information on your freight as well as on any unforeseen events.' },
                    { title: 'Traceability', text: 'Online tracking of your freight in real time.' },
                    { title: 'Carbon balance', text: 'A calculation of the carbon footprint is included in every call for tender.' },
                ],
            },
        ],
    },
    {
        slug: 'sea-and-air-freight',
        title: 'Sea & Air Freight',
        icon: 'Ship',
        summary: 'By using a combination of sea and air freight, you bring added flexibility to your supply chain.',
        cardImage: '/site/services/3.jpg',
        images: ['/site/services/s6.jpg', '/site/services/s5.jpg'],
        overview: [
            'By using a combination of sea and air freight, you bring added flexibility to your supply chain. Agility helps companies find the right cost-time balance, maximizing the affordability of ocean movements and the speed of air shipments. We have partnerships with the world’s most reliable sea and air carriers, so we can offer seamless shipping from origin to destination, for one rate, under a single document.',
            'Our freight professionals identify the forwarding and logistics services that are best to help you meet your objectives. With personal service and a broader range of freight products, we make sure your supply chain finds the best balance between urgency and cost.',
        ],
        sections: [
            {
                type: 'lists',
                items: [
                    {
                        heading: 'Air freight',
                        image: '/site/services/s3.jpg',
                        points: ['Export and import worldwide services', 'Space guaranteed with airlines', 'Hanging garment distribution', 'Cargo insurance for all types of transports', 'Customs clearance services for both imports and exports', 'Warehousing and distribution services'],
                    },
                    {
                        heading: 'Sea freight',
                        image: '/site/services/s4.jpg',
                        points: ['Combined sea and air imports from Asia, Middle East and Oceania offers a fast and reliable service', 'FCL (full container load), export and import to/from any destination in the world', 'Project cargo management for overweight / oversized cargoes', 'Bulk (conventional) sea freight shipments'],
                    },
                ],
            },
        ],
    },
    {
        slug: 'logistics-solutions',
        title: 'Logistics Solutions',
        icon: 'Truck',
        summary: 'Smart and sustainable business requires the skills of logistics experts who are able to think ahead.',
        cardImage: '/site/services/4.jpg',
        images: ['/site/services/s10.jpg', '/site/services/s11.jpg'],
        overview: [
            'Modern logistics is more than the smooth exchange of goods and information. Smart and sustainable business requires the skills of logistics experts who are able to think ahead. As a professional full-service logistics provider, we live this approach.',
            'From procurement to delivery and from individual shipments to mass distribution, Global Air Cargo logistics develops individual solutions for the entire supply chain. Carefully thought-out, tailor-made logistics solutions and a perfectly synchronised transport network guarantee a decisive competitive head start. Intelligent warehouse logistics ensures optimal stock levels as well as a rapid flow of goods. Targeted outsourcing of business processes increases efficiency. There are 1,000 possibilities. But they all come from a single source.',
        ],
        sections: [
            {
                type: 'accordion',
                items: [
                    { title: 'Clear Customer Value', paragraphs: ['Global Air Cargo & Logistics offers an effective suite of transportation services while bringing scale efficiencies to your business. We do this by leveraging our large volume and established contracts with a national network of carriers enabling our rates and service levels to rival any industry provider.', 'Our solutions include centralized visibility to track and trace data and standardized operating procedures. Transport providers achieve higher asset utilization and the savings are passed on to you. Performance standards are written into every carrier contract, leaving no guesswork about our customer requirements.'] },
                    { title: 'A Complete Transportation Solution', paragraphs: ['Global Air Cargo & Logistics is synonymous with transportation management. Our complete and scalable service of transportation procurement and administration ensures safe delivery of your freight on-time, every-time.'] },
                    { title: 'Experience Matters', paragraphs: ['Our experienced team of logistics professionals crosses all functional areas, including operations, finance, load planning, dispatch, customer service, and carrier management. From consolidating loads across clients to managing shipments, our team finds every way to improve your logistics operations both efficiently and effectively.'] },
                    { title: 'Need more information?', paragraphs: ['Contact our sales or customer service departments to get started. You’ll find the phone numbers and email for each of our offices on our Contact page.'] },
                ],
            },
        ],
    },
    {
        slug: 'warehousing-and-storage',
        title: 'Warehousing & Storage',
        icon: 'Warehouse',
        summary: 'Global Air Cargo is able to offer heated or unheated warehouse solutions both for short-term and for long-term storage.',
        cardImage: '/site/services/5.jpeg',
        images: ['/site/services/s1.jpg', '/site/services/s12.jpg'],
        overview: [
            'Warehousing and storage services offered by the Global Air Cargo Logistics group have become an integral part of our client’s requirements. As our clients continued to demand increased savings and efficiencies in their businesses, we have seen our business become at one with theirs.',
            'Supply chains have become shorter with ‘Value Added’ services becoming standard practice. The multi-task functions carried out by the Global Air Cargo Logistics group include warehousing and storage.',
        ],
        sections: [
            {
                type: 'features',
                heading: 'Storage solutions',
                items: [
                    { title: 'Dedicated & custom-built', text: 'We specialise in providing customised storage solutions for our customers – dedicated warehousing space is available throughout our Horn of Africa network.' },
                    { title: 'Multi-user facilities', text: 'Whether you require short, medium or long term warehousing, our multi-user facilities provide scalable solutions that share the cost of resources.' },
                    { title: 'Facility operations', text: 'We can take care of your warehouse operations and labour functions, making the most of your facility while you focus on your core business.' },
                ],
            },
        ],
    },
    {
        slug: 'forwarding-services',
        title: 'Forwarding Services',
        icon: 'Forward',
        summary: 'With our extensive network, we will find a competitive and efficient solution to your next assignment.',
        cardImage: '/site/services/6.jpg',
        images: ['/site/services/s14.jpg', '/site/services/s15.jpg'],
        overview: [
            'With our complex network of branches and agents in Kenya, Somalia and the East African Region, we can provide you with global freight forwarding services. Goods are transported by road, rail, water, and air. Agents trained in air safety ensure the smooth handling of the air freight.',
            'From the order confirmation, to project cargo, through to customs clearance, our competent multilingual team will be happy to advise you personally.',
        ],
        sections: [
            {
                type: 'accordion',
                heading: 'Discover our freight forwarding services',
                items: [
                    {
                        title: 'Land Transport',
                        lead: 'National and international truck transport',
                        paragraphs: ['Whether you want to transport one vehicle or 100 vehicles, special transport or heavy-duty transport, on the national overland route or across borders – we can provide you with the following professional and reliable transport solutions:'],
                        points: ['Flight charter services / trailers', 'Transport with open double-decker trucks', 'Transport with closed trucks', 'Transport by low-loader truck', 'Collection by the lessee'],
                        footer: 'We can also take care of customs clearance and arrange transport insurance.',
                    },
                    {
                        title: 'Sea Freight',
                        lead: 'Versatile sea freight',
                        paragraphs: ['We can deal with import and export:'],
                        points: ['Ro-ro handling and transport, special processing for classic cars', 'Container transport (container packing station, LCL/FCL)', 'Break bulk shipping', 'Project cargo'],
                        footer: 'Our range of maritime transport services includes customs clearance of all kinds (import and export), the organization of on-carriage and off-carriage, and transit documents, the arrangement of transport insurance, terminal processing, and the booking of shipping space or chartering, through to ship spare parts logistics.',
                    },
                    {
                        title: 'Air Freight',
                        paragraphs: ['Fast, safe, and reliable – taking full advantage of the traditional advantages of air freight, we can provide the following services:'],
                        points: ['Delivery and collection', 'More efficient shipping within more reliable transit times', 'Consolidation services', 'Customs clearance', 'Insurance services'],
                    },
                    {
                        title: 'Shuttle Transport',
                        paragraphs: ['We can take care of the regular transport between warehouse and production for you, as well as the internal transport. Naturally, we synchronize the schedules precisely with the timing of your production and adhere to them. Employing modern fleet vehicles, Global Air Cargo & Logistics selects the optimal means of transport depending on requirements, size, and functions. We develop an individual concept for you that is tailored to local conditions such as existing ramps, roofing, or space requirements.'],
                        points: ['Internal transport', 'Just in time transport between warehouse and production', 'Transport between operating sites / towns'],
                    },
                ],
            },
        ],
    },
    {
        slug: 'it-services',
        title: 'IT Services',
        icon: 'Monitor',
        summary: 'We provide bulk SMS and custom software development to help businesses improve communication and streamline operations.',
        cardImage: '/site/services/sms.png',
        images: ['/site/services/sms.png'],
        overview: [
            'We offer reliable IT solutions to support your business growth. Our services include bulk and transactional SMS to enhance customer communication, and custom software development for web, mobile, and enterprise systems. Whether you need to streamline operations or reach your clients faster, we provide smart, scalable tech solutions tailored to your needs.',
        ],
        sections: [
            {
                type: 'accordion',
                heading: 'Discover our IT services',
                items: [
                    {
                        title: 'SMS Communication Services',
                        paragraphs: ['Enhance your customer communication with our SMS services, designed for reliability and instant delivery:'],
                        points: [
                            'Transactional SMS – Instantly notify clients about shipment statuses, delivery confirmations, or payment alerts.',
                            'Promotional SMS – Reach your customers with special offers, updates, and announcements.',
                            'Bulk SMS – Send messages to thousands of contacts in a few clicks — ideal for marketing campaigns or organizational communication.',
                            'SMS Integration – Seamlessly integrate our SMS API with your systems (e.g., CRMs, ERPs) for automated messaging.',
                            'Custom Sender IDs – Brand your messages with a custom sender name for increased trust and recognition.',
                        ],
                        footer: 'Our SMS platform is secure, scalable, and optimized for high delivery rates across all networks in Kenya and Somalia.',
                    },
                    {
                        title: 'Software Development',
                        paragraphs: ['We deliver custom software solutions that help businesses optimize processes, improve user experience, and grow revenue:'],
                        points: [
                            'Web Applications – From e-commerce platforms to customer portals and logistics dashboards, we build robust, responsive web apps tailored to your needs.',
                            'Mobile Applications – Native or hybrid mobile apps for Android and iOS, designed for usability and performance.',
                            'Enterprise Software – Solutions like inventory management, HR systems, finance platforms, and workflow automation tools.',
                            'System Integration – Connect existing systems for smooth data flow and operational efficiency.',
                            'Custom Solutions – Need something unique? We design and develop software that aligns perfectly with your business model.',
                        ],
                        footer: 'We combine strategic thinking, modern technology, and clean design to build solutions that scale with your business.',
                    },
                ],
            },
        ],
    },
];

export const getService = (slug: string) => SERVICES.find(s => s.slug === slug);
