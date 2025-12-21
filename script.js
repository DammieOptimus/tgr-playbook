// --- FIREBASE IMPORTS ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getFirestore, doc, updateDoc, increment, onSnapshot } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";


// Wait until the entire HTML page is loaded before running our script
document.addEventListener('DOMContentLoaded', async () => {
    // --- FIREBASE CONFIGURATION ---
    // REPLACE THE VALUES BELOW WITH YOUR EXACT FIREBASE CONFIG
    const firebaseConfig = {
        apiKey: "AIzaSyCQ2IOoNAGEYWJMN4iB1j1cgg199MLqCnU",
        authDomain: "magic-notebook-project.firebaseapp.com",
        projectId: "magic-notebook-project",
        storageBucket: "magic-notebook-project.firebasestorage.app",
        messagingSenderId: "279845274939",
        appId: "1:279845274939:web:a7cfa6e916b7e5ca5d631e"
    };

    // --- INITIALIZE FIREBASE ---
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    const accordionContainer = document.getElementById('accordion-container');
    const yearSpan = document.getElementById('current-year');

    // --- Function 1: Set the current year in the footer ---
    const updateYear = () => {
        if (yearSpan) {
            yearSpan.textContent = new Date().getFullYear();
        }
    };


    // --- Function 2: Convert WhatsApp formatting to HTML for display ---
    // This makes the text look good inside the app.
    const formatContentForDisplay = (content) => {
        // Regex to find YouTube links, including standard, shorts, and youtu.be formats
        const youtubeRegex = /(https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)[^\s<]+)/g;

        // Regex to find other links (that are NOT YouTube links)
        const otherLinkRegex = /(https?:\/\/(?!.*(?:youtube\.com|youtu\.be))[^\s<]+)/g;

        return content
            // Bold and Italic: _*...*_ -> <h3>...</h3>
            .replace(/_\*(.*?)\*_/g, '<h3>$1</h3>')
            // Bold: *...* -> <strong>...</strong>
            .replace(/\*(.*?)\*/g, '<strong>$1</strong>')
            // Italic: _..._ -> <em>...</em>
            .replace(/_(.*?)_/g, '<em>$1</em>')
            // First, process and style YouTube links
            .replace(youtubeRegex, '<a href="$1" target="_blank" class="youtube-link"><i class="fab fa-youtube"></i> Watch Training Video <i class="fas fa-external-link-alt"></i></a>')
            // Then, process any other links normally
            .replace(otherLinkRegex, '<a href="$1" target="_blank">$1</a>')
            // Line breaks: \n -> <br>
            .replace(/\n/g, '<br>');
    };

    // --- Function 3: Fetch and display instructions ---
    const loadInstructions = async () => {
        try {
            // Fetch the data from our JSON file
            const response = await fetch('instructions.json');
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();

            const instructions = data.instructions;

            // Run the new function to set up the scrolling notice
            setupScrollingNotice(data.scrolling_notice);

            // --- START: Dynamic Referral ID Replacement ---
            // Get URL parameters
            const urlParams = new URLSearchParams(window.location.search);
            const refId = urlParams.get('refid'); // Look for ?refid=... in the URL

            // If a referral ID is found in the URL, replace the placeholder
            if (refId) {
                instructions.forEach(item => {
                    // Using a regular expression with a 'g' flag to replace all instances
                    item.content = item.content.replace(/TYPE-YOUR-REFERRAL-ID-HERE/g, refId);
                });
            } else {
                // If no refid, replace with the default generic text
                instructions.forEach(item => {
                    item.content = item.content.replace(/TYPE-YOUR-REFERRAL-ID-HERE/g, 'TYPE-YOUR-REFERRAL-ID-HERE');
                });
            }
            // --- END: Dynamic Referral ID Replacement ---

            // Clear the "Loading..." message
            accordionContainer.innerHTML = '';

            // Create an accordion item for each instruction
            instructions.forEach((item, index) => {
                const itemElement = document.createElement('div');
                itemElement.dataset.guideIndex = index + 1;
                itemElement.classList.add('accordion-item');

                // The formatted content for display inside the app
                const displayContent = formatContentForDisplay(item.content);

                const contentInnerDivId = `content-inner-${index}`; // Unique ID for the inner div

                itemElement.innerHTML = `
                    <div class="accordion-header">
                        <div class="accordion-number">${index + 1}</div>
                        <h2>${item.title}</h2>
                        <i class="icon fas fa-chevron-down"></i>
                    </div>
                    <div class="accordion-content">
                        <div class="accordion-content-inner" id="${contentInnerDivId}">
                            ${displayContent}
                        </div>
                    </div>
                `;

                accordionContainer.appendChild(itemElement);

                // If this guide item has a form, build and append it
                if (item.form) {
                    const contentContainer = itemElement.querySelector(`#${contentInnerDivId}`);
                    // Step 1: Build the basic container and input fields (if any)
                    buildAndAppendForm(item.form, contentContainer);
                    // Step 2: Now, run the interactivity/builder router for that form
                    initializeFormInteractivity(item.form);
                } else {
                    // --- START: Add this entire 'else' block ---
                    // Otherwise, add the standard "Copy for WhatsApp" button
                    const contentContainer = itemElement.querySelector(`#${contentInnerDivId}`);
                    const copyButton = document.createElement('button');
                    copyButton.className = 'copy-button';
                    copyButton.innerHTML = '<i class="fas fa-copy"></i> <span>Copy for WhatsApp</span>';
                    contentContainer.appendChild(copyButton);

                    copyButton.addEventListener('click', (e) => {
                        e.stopPropagation(); // Prevents the accordion from closing

                        // The original, unformatted text for WhatsApp
                        navigator.clipboard.writeText(item.content).then(() => {
                            // Provide visual feedback to the user
                            const buttonText = copyButton.querySelector('span');
                            buttonText.textContent = 'Copied!';
                            copyButton.classList.add('copied');

                            setTimeout(() => {
                                buttonText.textContent = 'Copy for WhatsApp';
                                copyButton.classList.remove('copied');
                            }, 2000); // Reset after 2 seconds
                        });
                    });
                    // --- END: Add this entire 'else' block ---
                }

            });


            // --- START: New Search Functionality ---
            const searchInput = document.getElementById('searchInput');
            const noResultsMessage = document.getElementById('no-results-message');
            const allGuides = document.querySelectorAll('.accordion-item');

            searchInput.addEventListener('input', (e) => {
                const searchTerm = e.target.value.toLowerCase();
                let matchesFound = 0;

                // Loop through the original data source, which is faster
                instructions.forEach((guide, index) => {
                    const guideTitle = guide.title.toLowerCase();
                    const guideContent = guide.content.toLowerCase();
                    const isMatch = guideTitle.includes(searchTerm) || guideContent.includes(searchTerm);

                    const guideElement = document.querySelector(`[data-guide-index="${index + 1}"]`);

                    if (guideElement) {
                        if (isMatch) {
                            guideElement.style.display = 'block';
                            matchesFound++;
                        } else {
                            guideElement.style.display = 'none';
                        }
                    }
                });

                // Show or hide the "no results" message
                if (matchesFound > 0) {
                    noResultsMessage.style.display = 'none';
                } else {
                    noResultsMessage.style.display = 'block';
                }
            });
            // --- END: New Search Functionality ---

        } catch (error) {
            accordionContainer.innerHTML = '<p style="color: red;">Failed to load instructions. Please check the file and try again.</p>';
            console.error('There was a problem fetching the instructions:', error);
        }
    };

    // --- Function 4: Handle accordion open/close logic ---
    accordionContainer.addEventListener('click', (e) => {
        const header = e.target.closest('.accordion-header');
        if (header) {
            const item = header.parentElement;

            // If the item is already active, we don't want to close others
            const isAlreadyActive = item.classList.contains('active');

            // Optional: Close all other items for a cleaner interface
            document.querySelectorAll('.accordion-item').forEach(el => el.classList.remove('active'));

            if (!isAlreadyActive) {
                item.classList.add('active');
            }

            // Adjust max-height for smooth animation
            document.querySelectorAll('.accordion-content').forEach(content => {
                if (content.parentElement.classList.contains('active')) {
                    content.style.maxHeight = content.scrollHeight + "px";
                } else {
                    content.style.maxHeight = '0';
                }
            });
        }
    });

    // --- Function 5: Animate the main video hub button text ---
    const setupRotatingButtonText = () => {
        const buttonTextSpan = document.querySelector('.video-hub-link span');

        // Safety check: if the button doesn't exist, do nothing.
        if (!buttonTextSpan) {
            return;
        }

        const texts = [
            "Explore the TGR Video Training Hub",
            "Click to See More TGR Videos",
            "Watch More TGR Videos",
            "Click to Learn More"
        ];
        let currentIndex = 0;

        // Set an interval to run the code every 10 seconds (10000 milliseconds)
        setInterval(() => {
            // 1. Fade the text out
            buttonTextSpan.style.opacity = '0';

            // 2. Wait for the fade-out transition to finish (500ms)
            setTimeout(() => {
                // 3. Change the index to the next text in the array
                currentIndex = (currentIndex + 1) % texts.length;

                // 4. Update the text content
                buttonTextSpan.textContent = texts[currentIndex];

                // 5. Fade the new text back in
                buttonTextSpan.style.opacity = '1';
            }, 500); // This delay must match the CSS transition duration

        }, 10000); // 10-second interval
    };

    // --- Function 6: Handle "Back to Top" button ---
    const setupBackToTopButton = () => {
        const backToTopBtn = document.getElementById('back-to-top-btn');

        if (!backToTopBtn) return;

        // Show or hide the button based on scroll position
        window.addEventListener('scroll', () => {
            // Show the button if user has scrolled down more than 300px
            if (window.scrollY > 300) {
                backToTopBtn.classList.add('show');
            } else {
                backToTopBtn.classList.remove('show');
            }
        });

        // Scroll to the top when the button is clicked
        backToTopBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth' // For a smooth scrolling animation
            });
        });
    };


    // --- Function 7: Setup the scrolling notice bar ---
    const setupScrollingNotice = (noticeData) => {
        // If the feature is disabled or data is missing, do nothing.
        if (!noticeData || !noticeData.enabled) {
            return;
        }

        const marqueeContainer = document.getElementById('marquee-container');
        let content = noticeData.content;

        // Find and replace [tel:...] placeholders
        content = content.replace(/\[tel:([\d\s+-]+)\]/g, '<a href="tel:$1" class="marquee-link tel-link">$1</a>');

        // Find and replace [link:...|...] placeholders
        content = content.replace(/\[link:(.*?)\|(.*?)\]/g, '<a href="$1" target="_blank" class="marquee-link web-link">$2</a>');

        // Create the main marquee bar
        const marqueeBar = document.createElement('div');
        marqueeBar.className = 'marquee-bar';

        // Create the inner content wrapper that will be animated
        const marqueeContent = document.createElement('div');
        marqueeContent.className = 'marquee-content';

        // Create TWO identical blocks of content for the seamless loop
        const contentBlock1 = document.createElement('div');
        contentBlock1.className = 'marquee-content-block';
        contentBlock1.innerHTML = content;

        const contentBlock2 = document.createElement('div');
        contentBlock2.className = 'marquee-content-block';
        contentBlock2.innerHTML = content;

        marqueeContent.appendChild(contentBlock1);
        marqueeContent.appendChild(contentBlock2);
        marqueeBar.appendChild(marqueeContent);
        marqueeContainer.appendChild(marqueeBar);

        // --- START: New Dynamic Speed Calculation ---
        // Define our desired speed in pixels per second. You can adjust this value.
        const PIXELS_PER_SECOND = 60;

        // Measure the actual width of one of the content blocks
        const contentWidth = contentBlock1.offsetWidth;

        // Calculate the required animation duration to maintain the desired speed
        // Duration (seconds) = Distance (pixels) / Speed (pixels per second)
        const duration = contentWidth / PIXELS_PER_SECOND;

        // Apply the dynamically calculated duration directly to the element's style
        marqueeContent.style.animationDuration = `${duration}s`;
        // --- END: New Dynamic Speed Calculation ---
    };


    // --- START: Form Generation Logic ---

    // NEW HELPER FUNCTION TO CONVERT A STRING TO TITLE CASE
    const toTitleCase = (str) => {
        if (!str) return '';
        // This regex finds the first character of every word (including after a hyphen or apostrophe)
        // and capitalizes it, after making the whole string lowercase first.
        return str.toLowerCase().replace(/(?:^|\s|-|')\S/g, (char) => char.toUpperCase());
    };

    // Main function to build and append a form inside a guide
    const buildAndAppendForm = (formJson, container) => {
        const formWrapper = document.createElement('div');
        formWrapper.className = 'form-in-guide';
        formWrapper.id = formJson.id;

        // --- START: CRITICAL FIX ---
        // First, check if this form has input fields. If not, it's a toolkit,
        // which is handled by a different function, so we can stop here.
        if (!formJson.fields) {
            container.appendChild(formWrapper); // Still add the main wrapper for the toolkit to use
            return;
        }
        // --- END: CRITICAL FIX ---

        // Build each field
        formJson.fields.forEach(field => {
            const fieldGroup = document.createElement('div');
            fieldGroup.className = 'form-group';

            const label = document.createElement('label');
            label.htmlFor = field.id;
            label.textContent = field.label;
            fieldGroup.appendChild(label);

            if (field.type === 'select') {
                const select = document.createElement('select');
                select.id = field.id;
                field.options.forEach(opt => {
                    const option = document.createElement('option');
                    option.value = opt.value;
                    option.textContent = opt.text;
                    select.appendChild(option);
                });
                fieldGroup.appendChild(select);
            } else { // Handles 'text', 'number', etc.
                const input = document.createElement('input');
                input.type = field.type;
                input.id = field.id;
                input.placeholder = field.placeholder || '';
                fieldGroup.appendChild(input);
            }
            formWrapper.appendChild(fieldGroup);
        });

        // Build the action button
        const button = document.createElement('button');
        button.id = formJson.button.id;
        button.className = 'form-action-btn';
        button.textContent = formJson.button.text;
        formWrapper.appendChild(button);

        // Build the result area
        const resultWrapper = document.createElement('div');
        resultWrapper.className = 'form-result-wrapper';
        if (formJson.result.type === 'textarea') {
            const textarea = document.createElement('textarea');
            textarea.id = formJson.result.id;
            textarea.readOnly = true;
            resultWrapper.appendChild(textarea);
        }
        formWrapper.appendChild(resultWrapper);

        container.appendChild(formWrapper);

        // After building, set up the interactivity
        //initializeFormInteractivity(formJson);
    };

    // This function acts as a "router" for all form logic
    const initializeFormInteractivity = (formJson) => {
        // SPECIAL CASE: For toolkits that need immediate setup, not a button click.
        if (formJson.calculation_logic === 'setupRegistrationToolkit') {
            setupRegistrationToolkit(formJson);
            return; // Stop here for this type of form
        }

        // Default behavior for calculator-style forms
        const button = document.getElementById(formJson.button.id);
        if (!button) return;

        button.addEventListener('click', () => {
            switch (formJson.calculation_logic) {
                case 'generateWelcomeMessage':
                    generateWelcomeMessage(formJson);
                    break;
                // Add other 'case' statements here for future forms
            }
        });
    };

    // The specific logic for our Welcome Message Generator (UPGRADED)
    const generateWelcomeMessage = (formJson) => {
        // 1. Get values from the form fields
        const nameInput = document.getElementById('newMemberName');
        const usernameInput = document.getElementById('newMemberUsername');
        const packageSelect = document.getElementById('packageType');
        const resultTextarea = document.getElementById(formJson.result.id);
        const resultWrapper = resultTextarea.parentElement;
        const generateBtn = document.getElementById(formJson.button.id); // Get the button itself

        // Get the values and immediately trim any leading/trailing whitespace
        const trimmedName = nameInput.value.trim();
        const trimmedUsername = usernameInput.value.trim();

        // Simple validation
        if (!trimmedName || !trimmedUsername) {
            alert('Please fill in both the name and username.');
            return;
        }

        // --- START: New visual feedback for the button ---
        const originalButtonText = generateBtn.innerHTML;
        generateBtn.innerHTML = '<i class="fas fa-check"></i> Generated!';
        generateBtn.classList.add('generated');
        // --- END: New visual feedback for the button ---

        // 2. Get the full text of the selected package
        const selectedPackageText = packageSelect.options[packageSelect.selectedIndex].text;
        const name = toTitleCase(trimmedName);
        const username = trimmedUsername;

        // 3. Construct the customized playbook link
        const playbookLink = `https://dammieoptimus.github.io/tgr-playbook/?refid=${username}`;

        // 4. Assemble the final message
        const message = `🎉🎉🎉 *BOOM‼️ BOOM‼️ BOOM‼️* 🎉🎉🎉

My dear *TGR FAMILY*, please help me give a *GRAND WELCOME* to our newest superstar 🌟  

👨‍🚀 *${name}*  
🔑 *Username: ${username}* 🚀  

...who just joined *TGR* with the *${selectedPackageText}* 

🎊🎊 *You're officially WELCOME to your* 🛢️ *TELECOMS SECTOR OIL WELL* 🛢️📲💰  
May this journey bring you *MASSIVE EARNINGS* and *UNSTOPPABLE SUCCESS*! 💸🔥

💃🏽🕺🏽💰📞📲🛢️💎🥳


📘 *_All the Information You Need to Use TGR is Here_*  
👇🏽👇🏽👇🏽👇🏽  

🔗 ${playbookLink} ✅  

_Everything you need — guides, videos, and tools — all in one place!_ 💡📲`;

        // 5. Display the message
        resultTextarea.value = message;
        resultWrapper.style.display = 'block';

        // --- START: CRITICAL FIX - Recalculate accordion height to show result immediately ---
        // This forces the accordion to resize to fit the new content
        const accordionContent = resultWrapper.closest('.accordion-content');
        if (accordionContent) {
            // First, set height to auto to find the new full height, then set it back to that height
            resultTextarea.style.height = 'auto';
            resultTextarea.style.height = (resultTextarea.scrollHeight) + 'px';
            accordionContent.style.maxHeight = accordionContent.scrollHeight + "px";
        }
        // --- END: CRITICAL FIX ---

        // 6. Create and add a "Copy" button if it doesn't exist
        if (!resultWrapper.querySelector('.copy-generated-text-btn')) {
            const copyBtn = document.createElement('button');
            copyBtn.className = 'copy-generated-text-btn';
            copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copy Message';
            resultWrapper.appendChild(copyBtn);

            copyBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(message).then(() => {
                    copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
                    setTimeout(() => {
                        copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copy Message';
                    }, 2000);
                });
            });
        }

        // Reset the generate button after 2 seconds
        setTimeout(() => {
            generateBtn.innerHTML = originalButtonText;
            generateBtn.classList.remove('generated');
        }, 2000);
    };
    // --- END: Form Generation Logic ---


    // --- Function 8: Handle deeplinking to a specific guide ---
    const handleDeeplinking = () => {
        const urlParams = new URLSearchParams(window.location.search);
        const guideNumber = urlParams.get('guide');

        // If no 'guide' parameter is found, do nothing.
        if (!guideNumber) {
            return;
        }

        // Find the target accordion item using the data attribute we added
        const targetGuide = document.querySelector(`[data-guide-index="${guideNumber}"]`);

        if (targetGuide) {
            // Use a short delay to ensure all content is rendered before scrolling
            setTimeout(() => {
                // Programmatically click the header to open the accordion
                targetGuide.querySelector('.accordion-header').click();

                // Add a temporary highlight class
                targetGuide.classList.add('deeplink-highlight');

                // Scroll the element into view smoothly
                targetGuide.scrollIntoView({ behavior: 'smooth', block: 'center' });

                // Remove the highlight class after a few seconds
                setTimeout(() => {
                    targetGuide.classList.remove('deeplink-highlight');
                }, 2500); // Highlight lasts for 2.5 seconds

            }, 200); // 200ms delay
        }
    };

    // --- Function 9: Animate the search input placeholder text ---
    const setupRotatingPlaceholder = () => {
        const searchInput = document.getElementById('searchInput');

        // Safety check: if the search input doesn't exist, do nothing.
        if (!searchInput) {
            return;
        }

        const placeholderPrompts = [
            "Search for 'password reset'...",
            "Try searching for 'buy data'...",
            "Looking for 'commissions'?",
            "Try searching 'how to activate'...",
            "Find the guide on 'upgrading'...",
            "Search for 'wallet funding'...",
            "Try searching 'cable tv'...",
            "How do I 'contact support'?",
            "Search by content or title...",
            "Find any guide instantly...",
            "Try searching 'referral link'...",
            "Type here to find what you need...",
            "Search guides by title or content...",
            "Type what you are looking for here...",
            "Try searching 'how to register'..."
        ];
        let currentIndex = 0;

        // Set an interval to run the code every 10 seconds
        setInterval(() => {
            // 1. Trigger the fade-out effect by adding a class
            searchInput.classList.add('placeholder-fade-out');

            // 2. Wait for the fade-out to finish
            setTimeout(() => {
                // 3. Cycle to the next prompt
                currentIndex = (currentIndex + 1) % placeholderPrompts.length;

                // 4. Update the placeholder text
                searchInput.placeholder = placeholderPrompts[currentIndex];

                // 5. Trigger the fade-in effect by removing the class
                searchInput.classList.remove('placeholder-fade-out');
            }, 500); // This must match the CSS transition duration

        }, 15000); // 15-second interval
    };

    // --- START: New Toolkit Logic ---

    // Helper function for visual feedback on copy buttons
    const giveCopyFeedback = (button, iconClass, text) => {
        const originalHTML = button.innerHTML;
        button.innerHTML = `<i class="fas fa-check"></i> Copied!`;
        button.classList.add('copied');
        setTimeout(() => {
            button.innerHTML = originalHTML;
            button.classList.remove('copied');
        }, 2000);
    };

    // The specific logic for our Registration Toolkit
    const setupRegistrationToolkit = (formJson) => {
        const formWrapper = document.getElementById(formJson.id);
        const { plans, details } = formJson.text_blocks;

        const combinedText = `${plans}\n\n${details}`;

        // Create the HTML structure for the toolkit
        formWrapper.innerHTML = `
        <div class="toolkit-section">
            <h4>Plans & Benefits Message</h4>
            <textarea readonly>${plans}</textarea>
            <button class="toolkit-copy-btn" data-copy-target="plans"><i class="fas fa-copy"></i> Copy Plans & Benefits</button>
        </div>
        <div class="toolkit-section">
            <h4>Registration Details Form</h4>
            <textarea readonly>${details}</textarea>
            <button class="toolkit-copy-btn" data-copy-target="details"><i class="fas fa-copy"></i> Copy Registration Form</button>
        </div>
        <button class="form-action-btn" data-copy-target="all"><i class="fas fa-clipboard-list"></i> Copy Both Messages Together</button>
    `;

        // Add event listeners to all new buttons
        const copyPlansBtn = formWrapper.querySelector('[data-copy-target="plans"]');
        const copyDetailsBtn = formWrapper.querySelector('[data-copy-target="details"]');
        const copyAllBtn = formWrapper.querySelector('[data-copy-target="all"]');

        copyPlansBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(plans);
            giveCopyFeedback(copyPlansBtn);
        });

        copyDetailsBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(details);
            giveCopyFeedback(copyDetailsBtn);
        });

        copyAllBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(combinedText);
            giveCopyFeedback(copyAllBtn);
        });

        // Auto-resize textareas to fit their content
        formWrapper.querySelectorAll('textarea').forEach(textarea => {
            textarea.style.height = 'auto';
            textarea.style.height = (textarea.scrollHeight) + 'px';
        });
    };

    // --- END: New Toolkit Logic ---

    // --- Function 9: Track Video Hub Clicks ---
    const setupClickTracking = () => {
        const videoButton = document.querySelector('.video-hub-link');

        if (videoButton) {
            videoButton.addEventListener('click', async () => {
                console.log("Video hub button clicked. Sending stats to Firestore...");

                try {
                    // 1. Create a reference to the specific document in the database
                    // Syntax: doc(database, "collection_name", "document_name")
                    const statsRef = doc(db, "app_stats", "general_analytics");

                    // 2. Update the document
                    // We use 'increment(1)' which is a special Firebase tool. 
                    // It safely adds 1 to the existing number, even if 100 people click at once.
                    await updateDoc(statsRef, {
                        video_hub_clicks: increment(1)
                    });

                    console.log("Click count incremented successfully!");
                } catch (error) {
                    console.error("Error updating click count:", error);
                }
            });
        }
    };

    // --- Function 10: Display Real-time Click Count ---
    const setupRealtimeCounter = () => {
        const counterSpan = document.querySelector('.click-counter');

        // Safety check
        if (!counterSpan) return;

        // Reference to the database document
        const statsRef = doc(db, "app_stats", "general_analytics");

        // "onSnapshot" sets up a permanent connection.
        // Whenever the database changes, this code runs automatically.
        onSnapshot(statsRef, (docSnapshot) => {
            if (docSnapshot.exists()) {
                const data = docSnapshot.data();
                // Get the number, or default to 0 if it doesn't exist yet
                const count = data.video_hub_clicks || 0;

                // Update the text on the screen
                counterSpan.textContent = `Total Clicks: ${count}`;
            } else {
                // If the document doesn't exist yet (first run), show 0
                counterSpan.textContent = `Total Clicks: 0`;
            }
        });
    };


    // --- Initial calls to run the app ---
    updateYear();
    await loadInstructions();
    setupRotatingButtonText();
    setupBackToTopButton();
    setupRotatingPlaceholder();
    handleDeeplinking();
    setupClickTracking();
    setupRealtimeCounter();

});
