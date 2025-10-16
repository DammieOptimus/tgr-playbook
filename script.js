// Wait until the entire HTML page is loaded before running our script
document.addEventListener('DOMContentLoaded', () => {

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
        // Regex to specifically find YouTube links (youtube.com or youtu.be)
        const youtubeRegex = /(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)[^\s<]+)/g;

        // Regex to find other links (that are NOT YouTube links)
        const otherLinkRegex = /(https?:\/\/(?!.*youtube\.com|.*youtu\.be)[^\s<]+)/g;

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
            const instructions = await response.json();

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
                itemElement.classList.add('accordion-item');

                // The formatted content for display inside the app
                const displayContent = formatContentForDisplay(item.content);

                itemElement.innerHTML = `
                    <div class="accordion-header">
                        <div class="accordion-number">${index + 1}</div>
                        <h2>${item.title}</h2>
                        <i class="icon fas fa-chevron-down"></i>
                    </div>
                    <div class="accordion-content">
                        <div class="accordion-content-inner">
                            ${displayContent}
                            <button class="copy-button" data-content-index="${index}">
                                <i class="fas fa-copy"></i>
                                <span>Copy for WhatsApp</span>
                            </button>
                        </div>
                    </div>
                `;

                accordionContainer.appendChild(itemElement);

                // Add event listener for the copy button
                const copyButton = itemElement.querySelector('.copy-button');
                copyButton.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevents the accordion from closing when button is clicked

                    // The original, unformatted text for WhatsApp
                    const originalContent = instructions[index].content;

                    navigator.clipboard.writeText(originalContent).then(() => {
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
            });
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

    // --- Initial calls to run the app ---
    updateYear();
    loadInstructions();
    setupRotatingButtonText();
});
