function initPopovers() {
    // Enable popovers
    updateAllPopovers();
}

function updateAllPopovers() {
    $('[data-toggle="popover"]').each(function() {
        var id = $(this).attr('id');
        updatePopover(id);
    });
}

function updatePopover(id) {
    // Update a single popover
    const selection = $('#' + id);
    const popover = POPOVERS[id];

    const title = popover.title;
    const content = popover.dataContent;
    const options = popover.options;

    if (title) selection.attr('title', title);
    if (content) selection.attr('data-content', content);
    if (options) selection.popover(options);
}