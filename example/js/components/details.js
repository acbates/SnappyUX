
sux.registerFactory('conspiracy', (hashPath, route) => new ConspiracyComponent(hashPath, hashPath));

class ConspiracyComponent {
    constructor(hashPath) {
        this.invalidId = null;
        this.conspiracy = null;
        this.conspiracyId = null;
        
        if (hashPath) {
            this.routeChanged(hashPath);
        }
    }
    
    async routeChanged(hashPath) {
        let temp = hashPath.substring(hashPath.lastIndexOf('/') + 1);
        if (temp === this.conspiracyId) return;
        
        this.conspiracyId = temp;
        this.invlidId = isNaN(temp);
        
        // load dancers from the server...
        if (this.conspiracy) {
            this.conspiracy = null;
            sux.repaint(this);
        }
        
        // take over the other object...
        // this.conspiracy = await sux.coreLambdaApi.post('getDetails', { dancerId: conspiracyId });
        this.conspiracy = await this.loadConspiracy(this.conspiracyId);
        
        sux.repaint(this);
    }
    
    async loadConspiracy(conspiracyId) {
        return await sux.conspiraciesApi.post('getConspiracy', { conspiracyId });
    }
    
    
    async testSubmit() {
        // just to show shenanigans happening in the draw function...
        console.log(this.dataInput?.name);
        console.log(this.dataInput?.tags);
        console.log(this.dataInput?.investigated);
        console.log(this.dataInput?.differentCheckbox);
        console.log(this.dataInput?.moreThing);
    }
    
    async submit() {
        if (!this.dataInput) return;
        // cleanup from the testing silliness
        delete this.dataInput.differentCheckbox;
        delete this.dataInput.moreThing;
        
        // set ID and send it
        this.dataInput.id = this.conspiracyId;
        await sux.conspiraciesApi.post('saveConspiracy', this.dataInput);

        // swap out the data, notify components that care
        sux.bodySnatch(this.conspiracy, this.dataInput);

        sux.go('home');
    }
    
    draw(d) {
        let con = this.conspiracy;
        if (con) {
            con = this.dataInput = JSON.parse(JSON.stringify(con));
        }
        
        return `
            <h2>Conspiracy Details</h2>
              ${ this.invlidId
                ? `<p>Invalid Conspiracy Id: ${ this.conspiracyId }</p>`
                : !con
                    ? '...loading...'
                    : `
                        <div>
                            <form id="conspiracyForm">
                                <label for="name">Name:</label>
                                <input type="text" name="name" required  ${ sux.bindValueChange('name', con) } >
                        
                                <label for="details">Details:</label>
                                <textarea name="details" required  style="height: 300px;" ${ sux.bindValueChange('details', con) } ></textarea>
                        
                                <div style="width: 100%; display: flex">
                                    <div style="float: left; width: 50%; padding-right: 100px">
                                        <label for="dateOfInspiration">Date of Inspiration:</label>
                                        <input type="date" name="dateOfInspiration" required  ${ sux.bindValueChange('dateOfInspiration', con) }>
                                    </div>
                                    <div style="float: left; width: 50%">
                                        <label for="flatnessScale">Flat Earth Scale (1-10):</label>
                                        <input type="number" name="flatnessScale" min="1" max="10" required  ${ sux.bindValueChange('flatnessScale', con) } >
                                    </div>
                                </div>

                                <label for="tags">Tags (comma-separated):</label>
                                <input type="text" name="tags"
                                  ${ sux.bindValueChange({
                                    obj: con,
                                    prop: 'tags',
                                    
                                    to: (v) => v.join(', '),
                                    from: (s) => (s || '').split(',').map(t => t.trim()).filter(s => !!s)
                                }) }
                                />
                                
                                <label class="checkbox-container" style="margin-top: 30px">Has been investigated
                                    <input type="checkbox" ${ sux.bindCheckedChange('investigated', con) } />
                                    <span class="checkmark"></span>
                                </label>
                                
                        
                                <div style="display: flex; margin-top: 50px">
                                  <!-- Submit -->
                                  <button type="button" ${ sux.onclick(() => this.submit()) } style="float: left">Save</button>
                                  
                                  <!-- Cancel is just a link back home... -->
                                  <button type="button" class="cancel" ${ sux.onclickGo('home') } style="float: left; margin-left: 20px">Cancel</button>
                                </div>
                            </form>
                            
                            <br><br>
                            <div style="border-bottom: 1px solid #335324; height:2px; margin-top: 30px"></div>
                                <b>SILLY UI TESTING</b> ( not part of submit, watch console, click checkbox, type in field )
                                <div style="display:flex">
                                    <div style="float: left; width: 25%">
                                        <label class="checkbox-container">Different Flag?
                                            ${(() => {
                                                // just some arbitrary logic...
                                                con.differentCheckbox = 'hells-yeah';
                    
                                            })() || ''}
                                            <input
                                              type="checkbox"
                                              ${sux.bind({
                                                    event: 'onchange',
                                                    draw: () => con.differentCheckbox === 'hells-yeah' ? ' checked ' : '',
                                                    from: (e) => {
                                                        console.log('checkbox changed to > ' + e.checked);
                                                        con.differentCheckbox = e.checked ? 'hells-yeah' : 'balls-no'
                                                    }
                                                })}
                                            />
                                            <span class="checkmark"></span>
                                        </label>
                                    </div>
                                    
                                    <div style="float: left; width: 75%">
                                        <label>Type stuff
                                            <input type="text"
                                              ${sux.bind({
                                                    event: {
                                                        'onchange': (e) => con.moreThing = e.value,
                                                        'onkeyup': (e, ev) => console.log('key event > ' + ev.key)
                                                    },
                                                    to: (e) => e.value = con.moreThing || '',
                                                })}
                                            />
                                            <span class="checkmark"></span>
                                        </label>
                                    </div>
                                </div>
                                <div style="background-color: #e5e5e5; height:1px"></div>
                                <button
                                  type="button"
                                  style="float: left; background-color: #e5e5e5; border: 2px solid #64b642; color:#64b642; font-weight: bold; cursor: pointer "
                                  ${ sux.onclick(() => this.testSubmit()) }
                                >
                                  Test Click
                                </button>
                                <br><br><br><br><br><br><br>
                        </div>
            `}
        `;
    }
}
