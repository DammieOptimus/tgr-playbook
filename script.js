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
        return content
            // Bold and Italic: _*...*_ -> <h3>...</h3>
            .replace(/_\*(.*?)\*_/g, '<h3>$1</h3>')
            // Bold: *...* -> <strong>...</strong>
            .replace(/\*(.*?)\*/g, '<strong>$1</strong>')
            // Italic: _..._ -> <em>...</em>
            .replace(/_(.*?)_/g, '<em>$1</em>')
            // Links: Make any http link clickable
            .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>')
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

    // --- Initial calls to run the app ---
    updateYear();
    loadInstructions();
});
