(function($){

	var research = {
		input: '',
		results: [],
		resultsMaxNum: 500,
		caseSensitive: false,
		findOnlyLinks: false,
		nodeIteratorIndex: 0,
		nodeIteratorPlaceholder: null,
		mode: 0
	};

	var $menu = null,
		$search = null,
		$resultSet = null,
		$searchIndex = null,
		$searchTotal = null,
		keyPressHandler = null;


	initDocEvents(document);

	function initDocEvents(doc) {
		console.log('Sherlock is listening...');
		$(doc).keydown(function(evt) {
			if($(evt.target).is('body')) {
				if(evt.which === 191) {
					displayMenu();
					return false; //to not insert the / into the search bar
				} else if (evt.which === 27) {
					displayMenu();
					$menu.addClass('research-hide');
					hideMenu();
				}
			}
		});
	}

	function displayMenu() {
		if($menu === null) {
			$menu = $('<div id="research" class="research-no-results"> <div id="research-bar"> <div id="research-bar-inner"><input type="text" id="research-searcher" placeholder="Find in page" autocomplete="off"/> <div id="research-searcher-index-wrap"> <div id="research-searcher-index">0</div> of <div id="research-searcher-total">0</div> </div> </div> <i tabindex="0"></i></div> <span> <div id="research-options"><table><tr><td><span id="research-match-case">Match <cite>C</cite>ase</span></td><td><span id="research-links-only"><cite>L</cite>inks Only</span></td><td><span id="research-highlight-all">Highlight <cite>A</cite>ll</span></td><td><a title="If you like Quick Find you can show your support rating it &#9733; 5 stars and leaving a nice little review" id="research-rate-it" target="_blank" href="https://chrome.google.com/webstore/detail/dejblhmebonldngnmeidliaifgiagcjj/reviews">&#9733;</a></td></tr><tr><td> <label for="research-search-normal">normal</label><input type="radio" name="mode" id="research-search-normal" value="normal" checked="checked"/> </span> </td> <td><span><label for="research-search-regex">regEx</label><input type="radio" name="mode" id="research-search-regex" value="regEx"/></span> </td> <td><span><label for="research-search-xpath">xPath</label><input type="radio" name="mode" id="research-search-xpath" value="xPath"/></span> </td> <td></td> </tr> </table> </div> <ul id="research-menu"></ul></div>');
			$('body').after($menu);
			$search = $menu.find('#research-searcher');
			$resultSet = $menu.find('ul');
			$searchIndex = $menu.find('#research-searcher-index');
			$searchTotal = $menu.find('#research-searcher-total');
			$menu = $('#research');
			initSearch();
			if(window.getSelection)
				$search.val(window.getSelection().toString());
			$search.keydown().focus(); //highlights the first result; //init menu
		} else {
			$menu.toggleClass('research-hide'); //show || hide
			if(!$menu.hasClass('research-hide')) {
				if (window.getSelection)
					$search.val(window.getSelection().toString());
				$search.keydown().focus(); //highlights the first result; //init menu
			}
			else
				hideMenu(); //reset menu

		}
	}

	function initSearch() {
		$search.keydown(function(evt){ //prevent cursor from moving
			if(evt.which === 40 || evt.which === 38 || (evt.which === 65 && evt.altKey === true) || (evt.which === 67 && evt.altKey === true) || (evt.which === 76 && evt.altKey === true)){
				console.log(evt);
				evt.preventDefault();
			}
		});
		$menu.keydown('input', searchInput);
		//$menu.on('keydown', 'input', searchInput);

	}

	function searchInput(evt) {
		console.log(evt);
		evt.stopPropagation();
		if(keyPressHandler)
			clearTimeout(keyPressHandler);

		keyPressHandler = setTimeout(function(){
			hideMenu();
			research.input = $search.val();
			if(research.input.trim() === ''){
				resetDisplayPosition();
				return;
			}
			research.results = [];
			processSearch();
		}, 150);
	}

	function resetDisplayPosition(){
		$menu.animate({
			right: 15
		},400);
	}


	function processSearch(){
		//controlla i vari tipi di ricerca
		var nodeIterator = document.createNodeIterator(document.body,  NodeFilter.SHOW_TEXT, normalSearchMode);
		resetNodeIterator();
		searchHelperMatrix(nodeIterator);
		getSelected().click();
	}

	function searchHelperMatrix(nodeIterator) {
		//console.log(nodeIterator);
		var textNode,
			length = research.input.length,
			i=0,
			$parent,
			startIndex,
			indices = [],
			_input,
			nodeText,
			href,
			processedHref,
			$closestAnchor,
			openLi = '<li role="menuitem" tabindex="0"><div class="research-li-inner">',
			closeLi = '</div></li>',
			$li,
			seeMoreLink = false;

		if(!nodeIterator){
			nodeIterator = research.nodeIteratorPlaceholder;
		}

		while ((textNode = nodeIterator.nextNode()) !== null) {
			$parent = $(textNode).parent();
			indices = research.results[research.nodeIteratorIndex];
			nodeText = textNode.data;

			//for (var k = indices.length - 1; k >= 0; k--) {
			for(var k = 0; k < indices.length; k++) {
				startIndex = indices[k];
				_input = textNode.data.slice(startIndex, startIndex + length);
				nodeText = textNode.data.substr(0, startIndex) + '<span class="research-ce-hl"></span>' + textNode.data.substr(startIndex + length);
				$li = $(openLi + nodeText + closeLi);
				$li.data({
					el: $parent,
					textEl: textNode
				}).find('.research-ce-hl').text(_input);


				$closestAnchor = $parent.closest('a');
				if ($closestAnchor.length > 0) {
					href = $closestAnchor.attr('href') || '';
					processedHref = linkMatch(href);
					if (processedHref !== '') {
						$li.append('<a href="' + href + '"' + ' title="' + processedHref + '">' + processedHref + '</a>');
					}
				}

				if (research.nodeIteratorIndex === 0) { //at least one result
					$li.addClass('research-selected');
					$menu.removeClass('research-no-results');
				}

				$resultSet.append($li);
			}
			//var $curItem = $($resultSet.find('li')[getCurrentResultSetIndex()]);
			//$curItem.addClass('research-hl');
			//highlightElement($curItem);
			i++;
			research.nodeIteratorIndex++;

			if (i === research.resultsMaxNum) {
				//add see more li
				updateSearchCounts(null, $resultSet.children().length + '+');
				$resultSet.append('<li class="research-see-more-link" role="menuitem" tabindex="0">See more results</li>');
				research.nodeIteratorPlaceholder = nodeIterator;
				seeMoreLink = true;
				break;
			}
		}
		//if(research.highlightAll)
		//	highlightAll();
		if(!seeMoreLink)
			updateSearchCounts(null,$resultSet.children().length);
	}

	function getCurrentResultSetIndex() {
		var ret = 0;
		for(var k = 0; k < research.results.length - 1; k++)
			ret += research.results[k].length;
		return ret;
	}

	function highlightElement($curItem) {
		var _input, textEl, newText, innerHTML,
			openHighlightDiv = '<span class="ps-ce-hl">',
			closeHighlightDiv = '</span>',
			startIndex = research.results[research.nodeIteratorIndex][0];
		textEl = $curItem.data().textEl.data;
		_input = textEl.slice(startIndex, startIndex + research.input.length);
		newText = textEl.slice().replace(new RegExp(_input, "gi"), openHighlightDiv + _input + closeHighlightDiv);
		innerHTML = $curItem.data().el.html();
		$curItem.data().el.html(innerHTML.replace(textEl,newText));
	}

	function highlightAll(){
		var items = $resultSet.find('li'),
			length,
			index = 0,
			$curItem;

		items = items.filter(function(){
			var $this = $(this);
			return !$this.hasClass('research-hl') && !$this.hasClass('research-see-more-link');
		});

		length = items.length;

		for(;index<length;index++){
			$curItem = $(items[index]);
			$curItem.addClass('research-hl');
			highlightSelected($curItem.index(),$curItem.data());
		}
	}

	function highlightSelected(index,data,selected){
		if(
			//search.highlightAll &&
			selected){
			curHighlightDiv = data.el.find('.research-ce-hl');
			if(curHighlightDiv.length > 0){
				curHighlightDiv.addClass('research-ce-hl-sel');
				return;
			}
		}
		var indices = research.results[index];
		var startIndex;
		for(var k = 0; k < indices.length; k++) {
			startIndex = indices[k];
			var textElData = data.textEl.data,
				input = textElData.slice(startIndex, startIndex + $search.val().length),
				highlightDiv = selected ? '<span class="research-ce-hl research-ce-hl-sel">' : '<span class="research-ce-hl">',
				newText = textElData.slice().replace(input, highlightDiv + input + '</span>'),
				innerHTML = data.el.html(),
				curHighlightDiv;

			data.el.html(innerHTML.replace(textElData,newText));
		}
		//var startIndex = research.results[index];
		////ensure modifying correct input if inputQuery occurs elsewhere in parent html.
		//var textElData = data.textEl.data,
		//	input = textElData.slice(startIndex, startIndex + $search.val().length),
		//	highlightDiv = selected ? '<span class="research-ce-hl research-ce-hl-sel">' : '<span class="research-ce-hl">',
		//	newText = textElData.slice().replace(input, highlightDiv + input + '</span>'),
		//	innerHTML = data.el.html(),
		//	curHighlightDiv;
        //
		//data.el.html(innerHTML.replace(textElData,newText));
	}


	function getSelected(){
		return $menu.find('li.research-selected');
	}

	function updateSearchCounts(index, total){
		if(index !== null){
			$searchIndex.text(index);
		}

		if(total !== null){
			$searchTotal.text(total);
		}
	}

	function normalSearchMode(node){
		var data = node ? node.data : '',
			parent = node ? node.parentNode : null,
			result = [],
			match, searchString, re;

		if($(parent).is('script,noscript,code') || !isVisible(node) /*	|| !linkCheck(node)*/)
			return NodeFilter.FILER_REJECT;

		searchString = research.input.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");

		re = new RegExp(searchString,"gi");
		while (match = re.exec(data))
			result.push(match.index);

		research.results[research.nodeIteratorIndex] = result;

		if(result.length > 0) {
			//console.log(result);
			return NodeFilter.FILTER_ACCEPT;
		}
		return NodeFilter.FILTER_REJECT;
	}

	function resetNodeIterator() {
		research.nodeIteratorIndex = 0;
		research.nodeIteratorPlaceholder = null;
	}

	function hideMenu() {
		$resultSet.empty();
		$menu.addClass('research-no-results');
	}

	function isVisible(element) {
		var style;
		while (element) {
			style = _getComputedStyle(element);
			if (style && (style.getPropertyValue('display') == 'none' || style.getPropertyValue('visibility') == 'hidden')){
				return false;
			}
			element = element.parentNode;
		}
		return true;
	}

	function _getComputedStyle(element){
		var style,
			_element = element;

		while(_element && _element.nodeType !== 1){
			_element = _element.parentNode;
		}

		style = _element && _element.nodeType == 1 ? window.getComputedStyle(_element) : null;
		return style;

	}

	function linkMatch(href){
		if(href.indexOf('http') === 0 || href.indexOf('ftp') === 0 ||  (href.length > 1 && href.indexOf('#') === 0)){
			return href;
		} else if(href[0] === '/'){
			return location.origin + href;
		} else if(href.indexOf('javascript') === 0 || href  === '#'){
			return '';
		} else {
			var pathName = location.pathname.split('/'),
				pathNameEnd,
				length = pathName.length;
			if(pathName[length-1] === ''){
				return location.origin + location.pathname;
			} else {
				pathNameEnd = pathName.slice(0,length-1);
				return location.origin + pathNameEnd.join('/') + '/' + href;
			}
		}
	}

})(window.jQuery);