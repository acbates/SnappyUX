

// the factory is simple, instance the Home class...
sux.registerFactory('home', () => new HomeComponent());

class HomeComponent {
    constructor() {
        this.conspiracies = null;
        
        // it starts empty, load the data!
        this.loadConspiracies();
    }
    
    async loadConspiracies() {
        // "searchConspiracies" is the service to get a list, just nothing to search with yet...
        this.conspiracies = await sux.conspiraciesApi.post('searchConspiracies', { offset: 10, limit: 10 });
        sux.repaint(this);
    }
    
    draw(d) {
        if (!this.conspiracies || this.conspiracies.length === 0) {
            return '...loading conspiracies...';
        }
        
        return `
          <div>
            <h2>Conspiracies List</h2>
            
            <table  class="table table-striped table-hover border-primary" style="width:100%">
              <thead>
              <tr>
                <th>Name</th>
                <th>Date of Inspiration</th>
                <th>Investigated?</th>
                <th>Flatness Scale</th>
                <th>Tags</th>
              </tr>
              </thead>
              <tbody class="table-group-divider">
              
                ${ this.conspiracies.map(conspiracy => sux.inject(conspiracy, c => `

                    <tr>
                        <td><a ${ sux.onclickGo('conspiracy/' + c.id) } style="color: #0f6702; cursor:pointer">${ c.name }</a></td>
                        <td>${ c.dateOfInspiration }</td>
                        <td>${ c.investigated }</td>
                        <td>${ c.flatnessScale }</td>
                        
                        ${'' /**
                            * Following is for the sake of show how details can be built out in anonymous components,
                            * but the "TagsManager" class at the bottom of the file is what it would be to upgrade it
                            * to it's own class. The loading HTML would be like...
                            *
                            *     <td>${ sux.inject(new TagsManager(c.tags)) }</td>
                            */}
                        <td>${ sux.inject(c.tags, (tags) => `
                          <div>
                            ${ tags.map(tag => `

                                <span class="tag">
                                  ${ tag }
                                  <a style="color: blue; font-weight: bold; text-decoration: none !important; cursor: pointer !important"
                                    ${sux.onclick(() => {
                                        tags.ripOne(v => v === tag);
                                        sux.touchData(tags);
                                    })}>x</a>
                                </span>
                                
                            `).join(' ')}
                            
                            <a style="color: #5d97aa; font-weight: bold; text-decoration: none !important; cursor: pointer !important"
                              ${ sux.onclick(() => {
                                    let val = (window.prompt('Enter a new tag name:') + '') ;
                                    if (val) {
                                        tags.push(val);
                                        sux.touchData(tags);
                                    }
                                }) }
                            > [+] </a>
                            
                          </div>`)}</td>
                        
                    </tr>
                    
                `)).join('\n')}

              </tbody>
            </table>
          </div>
        `;
    }
}


/**
 * Above is drawing the tags as an anonymous component, below is the equivalent class object.
 */
class TagsManager {
    constructor(tags) {
        this.tags = tags || [];
        this.data = [tags]; // tell Sux about them so it reloads updates automagically
    }
    
    addTag() {
        let val = (window.prompt('Enter a new tag name:') + '') ;
        if (val) {
            this.tags.push(val);
            sux.touchData(this.tags);
        }
    }
    
    tagClicked(tag) {
        this.tags.ripOne(v => v === tag);
        // we removed the thing, tell Sux about it
        sux.touchData(this.tags);
    }
    
    draw() {
        return `
          <div>
            ${ this.tags.map(tag => `
                <span class="tag">
                  ${ tag }
                  <a style="color: blue; font-weight: bold; text-decoration: none !important; cursor: pointer !important"
                    ${ sux.onclick(() => this.tagClicked(tag)) }>x</a>
                </span>
            `).join(' ')}
            
            <a style="color: #5d97aa; font-weight: bold; text-decoration: none !important; cursor: pointer !important"
              ${ sux.onclick(() => this.addTag()) }
            > [+] </a>
          </div>
      `;
    }
}

